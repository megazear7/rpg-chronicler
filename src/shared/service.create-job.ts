import z from "zod";
import { AbstractService, NoPathParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobIndex } from "./type.job.js";
import { ContentfulSubmissionSelection } from "./type.contentful-context.js";

export const CreateJobBodyParameters = z.object({
  file: z.any(),
  instructionsText: z.string().min(1),
  submission: ContentfulSubmissionSelection,
});
export type CreateJobBodyParameters = z.infer<typeof CreateJobBodyParameters>;

export class CreateJobService extends AbstractService<CreateJobBodyParameters, NoPathParams, JobIndex> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.post;
  readonly path = "/api/jobs";

  override async fetch(params: CreateJobBodyParameters): Promise<JobIndex> {
    const bodyParams = CreateJobBodyParameters.parse(params);
    const formData = new FormData();
    formData.append("file", bodyParams.file);
    formData.append("instructionsText", bodyParams.instructionsText);
    formData.append("submission", JSON.stringify(bodyParams.submission));

    const response = await fetch(this.path, {
      method: this.method.toUpperCase(),
      body: formData,
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: string };
      throw new Error(error.error ?? "Unable to create job.");
    }

    return JobIndex.parse(await response.json());
  }
}

export const createJobService = new CreateJobService(CreateJobBodyParameters, NoPathParams, JobIndex);