import z from "zod";

export const Health = z.object({
  healthy: z.boolean(),
});
export type Health = z.infer<typeof Health>;
