import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobDetail } from "./type.job.js";
import { JobImagePathParameters } from "./service.approve-job-image.js";

export class RejectJobImageService extends AbstractService<NoBodyParams, JobImagePathParameters, JobDetail> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.post;
  readonly path = "/api/jobs/:jobId/images/:imageId/reject";
}

export const rejectJobImageService = new RejectJobImageService(NoBodyParams, JobImagePathParameters, JobDetail);
