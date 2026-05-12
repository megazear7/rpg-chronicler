import { AbstractService, NoPathParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import z from "zod";

export const ExampleGenerationBodyParameters = z.object({
  instructions: z.string(),
});
export type ExampleGenerationBodyParameters = z.infer<typeof ExampleGenerationBodyParameters>;

export const ExampleGenerationResponse = z.object({
  message: z.string(),
});
export type ExampleGenerationResponse = z.infer<typeof ExampleGenerationResponse>;

export class ExampleGenerationService extends AbstractService<
  ExampleGenerationBodyParameters,
  NoPathParams,
  ExampleGenerationResponse
> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.post;
  readonly path = "/api/book/:book/field/:property/generate";
}

export const exampleGenerationService = new ExampleGenerationService(
  ExampleGenerationBodyParameters,
  NoPathParams,
  ExampleGenerationResponse,
);
