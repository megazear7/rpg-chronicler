import z from "zod";
import { AbstractService, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobDetail } from "./type.job.js";
import { JobPathParameters } from "./service.get-job.js";

export const CompleteContentfulStageBody = z.object({
  reference: z.string().trim().min(1),
});
export type CompleteContentfulStageBody = z.infer<typeof CompleteContentfulStageBody>;

export class CompleteContentfulStageService extends AbstractService<
  CompleteContentfulStageBody,
  JobPathParameters,
  JobDetail
> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.put;
  readonly path = "/api/jobs/:jobId/contentful/complete";
}

export const completeContentfulStageService = new CompleteContentfulStageService(
  CompleteContentfulStageBody,
  JobPathParameters,
  JobDetail,
);
