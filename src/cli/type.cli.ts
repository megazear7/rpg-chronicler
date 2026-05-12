import z from "zod";

export const ModelTypeOption = z.enum(["grok", "openai", "ollama", "custom"]);
export type ModelTypeOption = z.infer<typeof ModelTypeOption>;
