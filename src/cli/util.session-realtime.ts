import OpenAI from "openai";
import { OpenAIRealtimeWS } from "openai/realtime/ws";
import type { ResponseDoneEvent, SessionUpdateEvent } from "openai/resources/realtime/realtime.js";
import { sessionSpeakerInstructions, sessionSpeakerPrompt } from "../shared/prompt.session-speakers.js";
import type { AudioReasoningEffort, SessionCast, SessionPresetId } from "../shared/type.session.js";
import {
  describeChunk,
  PlannedChunk,
  scrubSecret,
  SessionCliError,
  SPEAKER_TAIL_LINES,
  transcriptTail,
} from "../shared/util.session.js";
import { streamPcm16 } from "./util.session-audio.js";

export interface RealtimeChunkRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  reasoningEffort: AudioReasoningEffort;
  filePath: string;
  chunk: PlannedChunk;
  chunkCount: number;
  cast: SessionCast;
  names: string[];
  presetId?: SessionPresetId;
  instructions?: string;
  previousTranscript: string;
  log: (message: string) => void;
}

export interface RealtimeChunkResult {
  transcript: string;
  inputTokens: number;
  outputTokens: number;
}

export async function transcribeChunk(request: RealtimeChunkRequest): Promise<RealtimeChunkResult> {
  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await transcribeChunkOnce(request);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retry = attempt < maxAttempts && isRetryableRealtimeError(message);
      if (!retry) {
        throw error instanceof SessionCliError ? error : new SessionCliError(scrubSecret(message, request.apiKey));
      }
      const delay = 1000 * 2 ** (attempt - 1);
      request.log(
        `Realtime request failed (${attempt} of ${maxAttempts}). Retrying in ${delay}ms. ${scrubSecret(message, request.apiKey)}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new SessionCliError(scrubSecret(message, request.apiKey));
}

async function transcribeChunkOnce(request: RealtimeChunkRequest): Promise<RealtimeChunkResult> {
  const label = describeChunk(request.chunk, request.chunkCount);
  const messages = await sessionSpeakerPrompt({
    cast: request.cast,
    names: request.names,
    chunkLabel: label,
    previousTail: transcriptTail(request.previousTranscript, SPEAKER_TAIL_LINES) || undefined,
    presetId: request.presetId,
    instructions: request.instructions,
  });
  const instructions = sessionSpeakerInstructions(messages);
  const client = new OpenAI({
    apiKey: request.apiKey,
    baseURL: request.baseUrl,
    timeout: 30 * 60 * 1000,
    maxRetries: 0,
  });
  const rt = new OpenAIRealtimeWS({ model: request.model }, client);
  let settled = false;
  let rejectConnection: (error: Error) => void = () => undefined;
  const connectionFailure = new Promise<never>((_, reject) => {
    rejectConnection = reject;
  });
  void connectionFailure.catch(() => undefined);
  const fail = (error: Error): void => {
    if (settled) {
      return;
    }
    settled = true;
    rejectConnection(new SessionCliError(scrubSecret(error.message, request.apiKey)));
  };
  rt.on("error", (error) => {
    fail(error);
  });
  rt.socket.on("close", (code, reason) => {
    if (!settled) {
      const text = Buffer.isBuffer(reason) ? reason.toString("utf8") : String(reason ?? "");
      fail(new SessionCliError(`Realtime connection closed (${code}). ${text}`.trim()));
    }
  });

  const parts: string[] = [];
  const onTextDone = (event: { text?: string }): void => {
    if (event.text?.trim()) {
      parts.push(event.text.trim());
    }
  };
  rt.on("response.output_text.done", onTextDone);

  try {
    await race(rt.emitted("session.created"), connectionFailure, 30_000, "session.created");
    const updated = rt.emitted("session.updated");
    rt.send({
      type: "session.update",
      session: sessionConfig(instructions, request.reasoningEffort),
    });
    await race(updated, connectionFailure, 30_000, "session.updated");

    request.log(`Streaming ${request.filePath} ${label} to ${request.model}.`);
    let sentSeconds = 0;
    const sentBytes = await streamPcm16({
      filePath: request.filePath,
      startSeconds: request.chunk.startSeconds,
      durationSeconds: request.chunk.durationSeconds,
      onFrame: async (frame) => {
        await waitForSocket(rt.socket);
        rt.send({ type: "input_audio_buffer.append", audio: frame.toString("base64") });
        sentSeconds += 1;
        if (sentSeconds % 30 === 0) {
          request.log(`  streamed about ${sentSeconds} seconds.`);
        }
      },
    });
    if (sentBytes < 4800) {
      throw new SessionCliError(`"${request.filePath}" ${label} was shorter than 100 ms after conversion.`);
    }

    const committed = rt.emitted("input_audio_buffer.committed");
    rt.send({ type: "input_audio_buffer.commit" });
    await race(committed, connectionFailure, 60_000, "input_audio_buffer.committed");

    const doneEvent = rt.emitted("response.done");
    rt.send({
      type: "response.create",
      response: {
        output_modalities: ["text"],
        instructions,
        max_output_tokens: "inf",
      },
    });
    const done = await race(doneEvent, connectionFailure, 10 * 60 * 1000, "response.done");
    const transcript = parts.join("\n").trim();
    const failure = responseFailure(done);
    if (!transcript) {
      throw new SessionCliError(failure ?? "The Realtime model returned an empty transcript.");
    }
    if (failure) {
      request.log(failure);
    }
    settled = true;
    return {
      transcript,
      inputTokens: done.response.usage?.input_tokens ?? 0,
      outputTokens: done.response.usage?.output_tokens ?? 0,
    };
  } finally {
    settled = true;
    rt.off("response.output_text.done", onTextDone);
    rt.close();
  }
}

function sessionConfig(instructions: string, reasoningEffort: AudioReasoningEffort): SessionUpdateEvent["session"] {
  const session = {
    type: "realtime" as const,
    output_modalities: ["text" as const],
    instructions,
    max_output_tokens: "inf" as const,
    audio: {
      input: {
        format: { type: "audio/pcm" as const, rate: 24000 as const },
        turn_detection: null,
        noise_reduction: { type: "far_field" as const },
      },
    },
    ...(reasoningEffort === "off" ? {} : { reasoning: { effort: reasoningEffort } }),
  };
  return session as SessionUpdateEvent["session"];
}

function responseFailure(event: ResponseDoneEvent): string | undefined {
  const status = event.response.status;
  if (!status || status === "completed") {
    return undefined;
  }
  const details = event.response.status_details ? JSON.stringify(event.response.status_details) : "";
  return `Realtime response ${status}. ${details}`.trim();
}

async function race<T>(event: Promise<T>, failure: Promise<never>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SessionCliError(`Timed out waiting for ${label}.`)), timeoutMs);
  });
  try {
    return await Promise.race([event, failure, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function waitForSocket(socket: { bufferedAmount: number }): Promise<void> {
  while (socket.bufferedAmount > 4_000_000) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

function isRetryableRealtimeError(message: string): boolean {
  return /timeout|timed out|rate limit|429|500|502|503|504|ECONNRESET|EAI_AGAIN|socket hang up|connection closed/i.test(
    message,
  );
}
