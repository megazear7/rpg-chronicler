import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { JobPathParameters } from "./service.get-job.js";
import { HttpMethod } from "./type.http.js";
import { JobDetail } from "./type.job.js";

export class RestoreJobService extends AbstractService<NoBodyParams, JobPathParameters, JobDetail> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.post;
  readonly path = "/api/jobs/:jobId/restore";
}

export const restoreJobService = new RestoreJobService(NoBodyParams, JobPathParameters, JobDetail);
