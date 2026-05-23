import z from "zod";
import { AbstractService, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobDetail } from "./type.job.js";
import { JobPathParameters } from "./service.get-job.js";

export const CompleteNotionStageBody = z.object({
  reference: z.string().trim().min(1),
});
export type CompleteNotionStageBody = z.infer<typeof CompleteNotionStageBody>;

export class CompleteNotionStageService extends AbstractService<CompleteNotionStageBody, JobPathParameters, JobDetail> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.put;
  readonly path = "/api/jobs/:jobId/notion/complete";
}

export const completeNotionStageService = new CompleteNotionStageService(
  CompleteNotionStageBody,
  JobPathParameters,
  JobDetail,
);
