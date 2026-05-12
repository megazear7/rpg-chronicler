import z from "zod";
import { AbstractService, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { renderPathname } from "./util.route-params.js";

export const UploadReferenceBodyParameters = z.object({
  file: z.any(),
});
export type UploadReferenceBodyParameters = z.infer<typeof UploadReferenceBodyParameters>;

export const UploadReferencePathParameters = z.object({
  name: z.string(),
});
export type UploadReferencePathParameters = z.infer<typeof UploadReferencePathParameters>;

export const UploadReferenceResponse = z.object({
  success: z.boolean(),
});
export type UploadReferenceResponse = z.infer<typeof UploadReferenceResponse>;

export class UploadReferenceService extends AbstractService<
  UploadReferenceBodyParameters,
  UploadReferencePathParameters,
  UploadReferenceResponse
> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.put;
  readonly path = "/api/book/:book/upload/:filename";

  override async fetch(
    params: UploadReferencePathParameters | UploadReferenceBodyParameters,
  ): Promise<UploadReferenceResponse> {
    const pathParams = UploadReferencePathParameters.strip().parse(params);
    const path = renderPathname(this.path, {
      name: pathParams.name,
    });
    const formData = new FormData();
    const bodyParams = UploadReferenceBodyParameters.strip().parse(params);
    formData.append("file", bodyParams.file);
    const response = await fetch(path, {
      method: "POST",
      body: formData,
    });
    return { success: response.ok };
  }
}

export const uploadReferenceService = new UploadReferenceService(
  UploadReferenceBodyParameters,
  UploadReferencePathParameters,
  UploadReferenceResponse,
);
