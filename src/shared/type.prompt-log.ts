import z from "zod";

export const PromptLog = z.object({
  timestamp: z.number(),
  input: z.any(),
  output: z.any().optional(),
});

export type PromptLog = z.infer<typeof PromptLog>;
