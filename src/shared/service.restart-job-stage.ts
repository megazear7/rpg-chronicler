import z from "zod";
import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobDetail, JobStageName } from "./type.job.js";

export const RestartJobStagePathParameters = z.object({
  jobId: z.uuid(),
  stageName: JobStageName,
});
export type RestartJobStagePathParameters = z.infer<typeof RestartJobStagePathParameters>;

export class RestartJobStageService extends AbstractService<NoBodyParams, RestartJobStagePathParameters, JobDetail> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.post;
  readonly path = "/api/jobs/:jobId/restart/:stageName";
}

export const restartJobStageService = new RestartJobStageService(
  NoBodyParams,
  RestartJobStagePathParameters,
  JobDetail,
);
