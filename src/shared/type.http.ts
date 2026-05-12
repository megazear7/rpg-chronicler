import z from "zod";

export const HttpMethod = z.enum(["get", "post", "put", "delete"]);
export type HttpMethod = z.infer<typeof HttpMethod>;

export const ErrorResponse = z.object({
  error: z.string(),
  detail: z.any().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
