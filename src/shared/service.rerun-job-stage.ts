import z from "zod";
import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobDetail, JobStageName } from "./type.job.js";

export const RerunJobStagePathParameters = z.object({
  jobId: z.uuid(),
  stageName: JobStageName,
});
export type RerunJobStagePathParameters = z.infer<typeof RerunJobStagePathParameters>;

export class RerunJobStageService extends AbstractService<NoBodyParams, RerunJobStagePathParameters, JobDetail> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.post;
  readonly path = "/api/jobs/:jobId/stages/:stageName/rerun";
}

export const rerunJobStageService = new RerunJobStageService(NoBodyParams, RerunJobStagePathParameters, JobDetail);
