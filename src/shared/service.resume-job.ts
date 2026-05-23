import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { JobPathParameters } from "./service.get-job.js";
import { HttpMethod } from "./type.http.js";
import { JobDetail } from "./type.job.js";

export class ResumeJobService extends AbstractService<NoBodyParams, JobPathParameters, JobDetail> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.post;
  readonly path = "/api/jobs/:jobId/resume";
}

export const resumeJobService = new ResumeJobService(NoBodyParams, JobPathParameters, JobDetail);
