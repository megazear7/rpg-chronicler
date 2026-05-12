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
  const output = await client.chat.completions.create(input);
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
