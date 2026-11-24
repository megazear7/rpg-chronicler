import OpenAI, { APIError } from "openai";
import type { ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam } from "openai/resources";
import { sessionPrompt } from "../shared/prompt.session.js";
import type { SessionPresetId } from "../shared/type.session.js";
import {
  scrubSecret,
  SessionCliError,
  splitTranscript,
  stripModelFences,
  TRANSCRIPT_PART_CHAR_BUDGET,
} from "../shared/util.session.js";
import type { SessionCast, TextReasoningEffort } from "../shared/type.session.js";

export interface TextTaskRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  reasoningEffort: TextReasoningEffort;
  cast: SessionCast;
  presetId?: SessionPresetId;
  instructions?: string;
  transcript: string;
  log: (message: string) => void;
}

export interface TextTaskResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export async function runTextTask(request: TextTaskRequest): Promise<TextTaskResult> {
  const parts = splitTranscript(request.transcript, TRANSCRIPT_PART_CHAR_BUDGET);
  const client = new OpenAI({
    apiKey: request.apiKey,
    baseURL: request.baseUrl,
    timeout: 30 * 60 * 1000,
    maxRetries: 0,
  });
  let inputTokens = 0;
  let outputTokens = 0;

  if (parts.length === 1) {
    const messages = await sessionPrompt({
      mode: "produce",
      cast: request.cast,
      presetId: request.presetId,
      instructions: request.instructions,
      transcript: parts[0],
    });
    const completion = await complete(client, request, messages);
    inputTokens += completion.inputTokens;
    outputTokens += completion.outputTokens;
    return { text: completion.text, inputTokens, outputTokens };
  }

  const partials: string[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    request.log(`Writing part ${index + 1} of ${parts.length} with ${request.model}.`);
    const messages = await sessionPrompt({
      mode: "produce",
      cast: request.cast,
      presetId: request.presetId,
      instructions: request.instructions,
      transcript: parts[index],
      part: { index: index + 1, count: parts.length },
    });
    const completion = await complete(client, request, messages);
    partials.push(completion.text);
    inputTokens += completion.inputTokens;
    outputTokens += completion.outputTokens;
  }

  request.log(`Combining ${parts.length} parts with ${request.model}.`);
  const combined = await sessionPrompt({
    mode: "combine",
    cast: request.cast,
    presetId: request.presetId,
    instructions: request.instructions,
    partials,
  });
  const completion = await complete(client, request, combined);
  return {
    text: completion.text,
    inputTokens: inputTokens + completion.inputTokens,
    outputTokens: outputTokens + completion.outputTokens,
  };
}

async function complete(
  client: OpenAI,
  request: TextTaskRequest,
  messages: ChatCompletionMessageParam[],
): Promise<TextTaskResult> {
  const params: ChatCompletionCreateParamsNonStreaming = {
    model: request.model,
    messages,
  };
  if (request.reasoningEffort !== "off") {
    params.reasoning_effort = request.reasoningEffort as ChatCompletionCreateParamsNonStreaming["reasoning_effort"];
  }

  const maxAttempts = 4;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await client.chat.completions.create(params);
      const text = stripModelFences(response.choices[0]?.message?.content ?? "");
      if (!text) {
        throw new SessionCliError("The text model returned an empty response.");
      }
      return {
        text,
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      };
    } catch (error) {
      lastError = error;
      const retry = attempt < maxAttempts && isRetryableTextError(error);
      const message = error instanceof Error ? error.message : String(error);
      if (!retry) {
        throw error instanceof SessionCliError
          ? error
          : new SessionCliError(`Text model request failed: ${scrubSecret(message, request.apiKey)}`);
      }
      const delay = 1000 * 2 ** (attempt - 1);
      request.log(`Text model request failed (${attempt} of ${maxAttempts}). Retrying in ${delay}ms.`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new SessionCliError(`Text model request failed: ${scrubSecret(message, request.apiKey)}`);
}

function isRetryableTextError(error: unknown): boolean {
  if (error instanceof SessionCliError) {
    return false;
  }
  if (error instanceof APIError) {
    return error.status === 408 || error.status === 409 || error.status === 429 || error.status >= 500;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|ECONNRESET|EAI_AGAIN|socket hang up|fetch failed/i.test(message);
}
