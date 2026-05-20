import z from "zod";
import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobDetail } from "./type.job.js";

export const JobPathParameters = z.object({
  jobId: z.uuid(),
});
export type JobPathParameters = z.infer<typeof JobPathParameters>;

export class GetJobService extends AbstractService<NoBodyParams, JobPathParameters, JobDetail> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.get;
  readonly path = "/api/jobs/:jobId";
}

export const getJobService = new GetJobService(NoBodyParams, JobPathParameters, JobDetail);
