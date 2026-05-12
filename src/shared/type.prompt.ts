import z from "zod";

export const Role = z.enum(["system", "user", "assistant"]);
export type Role = z.infer<typeof Role>;

export const Prompt = z.string().min(1).describe("A prompt to an ai model");
export type Prompt = z.infer<typeof Prompt>;

export const Response = z.string().min(1).describe("An ai model response");
export type Response = z.infer<typeof Response>;

export const ModelName = z.string().min(1).describe("The name of an ai model");
export type ModelName = z.infer<typeof ModelName>;

export const UsageTokens = z.number().min(0).describe("The number of tokens used of all types.");
export type UsageTokens = z.infer<typeof UsageTokens>;

export const Usage = z.object({
  completion_tokens: UsageTokens,
  prompt_tokens: UsageTokens,
});
export type Usage = z.infer<typeof Usage>;

export const InputTokenCost = z.number().min(0).describe("The cost in dollars per million input tokens.");
export type InputTokenCost = z.infer<typeof InputTokenCost>;

export const InputTokenCount = z.number().min(0).describe("The number of input tokens used.");
export type InputTokenCount = z.infer<typeof InputTokenCount>;

export const OutputTokenCost = z.number().min(0).describe("The cost in dollars per million output tokens.");
export type OutputTokenCost = z.infer<typeof OutputTokenCost>;

export const OutputTokenCount = z.number().min(0).describe("The number of output tokens used.");
export type OutputTokenCount = z.infer<typeof OutputTokenCount>;

export const Cost = z.object({
  inputTokenCost: InputTokenCost,
  inputTokenCount: InputTokenCount,
  outputTokenCost: OutputTokenCost,
  outputTokenCount: OutputTokenCount,
});
export type Cost = z.infer<typeof Cost>;
