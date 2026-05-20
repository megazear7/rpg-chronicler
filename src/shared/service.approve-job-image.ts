import z from "zod";
import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobDetail } from "./type.job.js";

export const JobImagePathParameters = z.object({
  jobId: z.uuid(),
  imageId: z.string().min(1),
});
export type JobImagePathParameters = z.infer<typeof JobImagePathParameters>;

export class ApproveJobImageService extends AbstractService<NoBodyParams, JobImagePathParameters, JobDetail> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.post;
  readonly path = "/api/jobs/:jobId/images/:imageId/approve";
}

export const approveJobImageService = new ApproveJobImageService(NoBodyParams, JobImagePathParameters, JobDetail);
