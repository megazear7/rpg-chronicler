import { ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam, CompletionUsage } from "openai/resources";
import z, { ZodType } from "zod";
import { getAppConfig } from "./util.app.js";
import { loadTextClient } from "./util.model.js";
import { ModelConfigs } from "../shared/type.model.js";
import { PromptLog } from "../shared/type.prompt-log.js";
import { promises as fs } from "fs";
import { ONE_HOUR_IN_MS } from "../shared/util.time.js";

interface CompletionWithUsage<T> {
  completion: T;
  usage: CompletionUsage;
}

interface RetryModelRequestOptions {
  onRetry?: (error: unknown, attempt: number, maxAttempts: number, delayMs: number) => Promise<void> | void;
}

const MODEL_REQUEST_MAX_ATTEMPTS = 4;
const MODEL_REQUEST_BASE_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 429]);
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENETDOWN",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
]);
const RETRYABLE_MESSAGE_PATTERNS = [
  /model produced invalid content/i,
  /rate limit/i,
  /temporar(?:y|ily) unavailable/i,
  /timeout/i,
  /timed out/i,
  /connection error/i,
  /fetch failed/i,
  /socket hang up/i,
  /overloaded/i,
  /internal server error/i,
];

function extractErrorDetails(error: unknown): { status?: number; code?: string; message: string } {
  if (error instanceof Error) {
    const withDetails = error as Error & { status?: number; code?: string };
    return {
      status: typeof withDetails.status === "number" ? withDetails.status : undefined,
      code: typeof withDetails.code === "string" ? withDetails.code : undefined,
      message: error.message,
    };
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as { status?: unknown; code?: unknown; message?: unknown };
    return {
      status: typeof candidate.status === "number" ? candidate.status : undefined,
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      message: typeof candidate.message === "string" ? candidate.message : String(error),
    };
  }

  return { message: String(error) };
}

function isRetryableModelError(error: unknown): boolean {
  const { status, code, message } = extractErrorDetails(error);

  if (typeof status === "number" && (status >= 500 || RETRYABLE_STATUS_CODES.has(status))) {
    return true;
  }

  if (code && RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }

  return RETRYABLE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
}

function getRetryDelayMs(attempt: number): number {
  const exponentialDelay = MODEL_REQUEST_BASE_DELAY_MS * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 250);
  return exponentialDelay + jitter;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function withModelRequestRetry<T>(
  operation: () => Promise<T>,
  options: RetryModelRequestOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MODEL_REQUEST_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < MODEL_REQUEST_MAX_ATTEMPTS && isRetryableModelError(error);
      if (!shouldRetry) {
        throw error;
      }

      const delayMs = getRetryDelayMs(attempt);
      await options.onRetry?.(error, attempt, MODEL_REQUEST_MAX_ATTEMPTS, delayMs);
      await wait(delayMs);
    }
  }

  throw lastError;
}

export async function getTextCompletion<T>(
  messages: ChatCompletionMessageParam[],
  modelConfigs: ModelConfigs,
  zod?: ZodType<T>,
): Promise<CompletionWithUsage<T>> {
  const debugDir = "data/prompt";
  const timestamp = Date.now();
  const debugFile = `${debugDir}/${timestamp}-prompt.json`;
  await fs.mkdir(debugDir, { recursive: true });
  const client = await loadTextClient(modelConfigs);
  const input: ChatCompletionCreateParamsNonStreaming = {
    model: modelConfigs.text.modelName,
    messages: messages,
  };

  if (zod) {
    const innerSchema = z.toJSONSchema(zod);
    const jsonSchemaForOpenAI = {
      name: "schema",
      schema: innerSchema,
      strict: true,
    };
    input.response_format = {
      type: "json_schema",
      json_schema: jsonSchemaForOpenAI,
    };
  }

  const files = await fs.readdir(debugDir);
  const now = Date.now();
  for (const file of files) {
    const filePath = `${debugDir}/${file}`;
    if (file.includes("-")) {
      const timestampStr = file.split("-")[0];
      const timestamp = parseInt(timestampStr);
      if (now - timestamp > ONE_HOUR_IN_MS) {
        await fs.unlink(filePath);
      }
    }
  }

  await fs.writeFile(debugFile, JSON.stringify(PromptLog.parse({ timestamp, input }), null, 2));

  let output;
  try {
    output = await withModelRequestRetry(() => client.chat.completions.create(input));
  } catch (error) {
    await fs.writeFile(
      debugFile,
      JSON.stringify(
        PromptLog.parse({
          timestamp,
          input,
          error: {
            message: error instanceof Error ? error.message : String(error),
            ...(typeof error === "object" && error !== null ? error : {}),
          },
        }),
        null,
        2,
      ),
    );
    throw error;
  }

  if (!output.choices[0].message.content) {
    throw new Error("No response");
  }

  await fs.writeFile(debugFile, JSON.stringify(PromptLog.parse({ timestamp, input, output }), null, 2));

  if (zod) {
    return {
      completion: zod.parse(JSON.parse(output.choices[0].message.content)),
      usage: output.usage!,
    };
  } else {
    return {
      completion: output.choices[0].message.content as T,
      usage: output.usage!,
    };
  }
}

export async function submitPrompt<T>(messages: ChatCompletionMessageParam[], zod?: ZodType<T>): Promise<T> {
  const app = await getAppConfig();
  const completionWithUsage = await getTextCompletion(messages, app.model, zod);
  return completionWithUsage.completion;
}
