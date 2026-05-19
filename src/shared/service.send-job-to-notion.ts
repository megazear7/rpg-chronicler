import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobDetail } from "./type.job.js";
import { JobPathParameters } from "./service.get-job.js";

export class SendJobToNotionService extends AbstractService<NoBodyParams, JobPathParameters, JobDetail> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.post;
  readonly path = "/api/jobs/:jobId/notion/send";
}

export const sendJobToNotionService = new SendJobToNotionService(NoBodyParams, JobPathParameters, JobDetail);