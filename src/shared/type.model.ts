import z from "zod";
import { Cost, Usage } from "./type.prompt.js";

export const MessageType = z.enum(["system", "user", "assistant"]);
export type MessageType = z.infer<typeof MessageType>;

export const ModelTypeName = z
  .string()
  .min(3)
  .describe(
    "The model name. This should correspond to an environment variable ending with _MODEL_API_KEY (e.g., GROK_MODEL_API_KEY).",
  );
export type ModelTypeName = z.infer<typeof ModelTypeName>;

export const ModelTypeConfig = z.object({
  name: ModelTypeName,
  endpoint: z.string().describe("The base URL for the model API"),
  modelName: z.string().describe("The specific model name to use"),
  voice: z.string().optional().describe("Voice name for audio models"),
  deployment: z.string().optional().describe("Azure deployment name (required for Azure models)"),
  cost: Cost,
  usage: Usage,
});
export type ModelTypeConfig = z.infer<typeof ModelTypeConfig>;

export const ModelConfigs = z.object({
  text: ModelTypeConfig,
  audio: ModelTypeConfig,
});
export type ModelConfigs = z.infer<typeof ModelConfigs>;
