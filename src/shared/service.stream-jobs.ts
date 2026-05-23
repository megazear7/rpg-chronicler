import z from "zod";
import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobListFilter } from "./type.job.js";

export const StreamJobsPathParameters = z.object({
  filter: JobListFilter,
  page: z.string(),
  pageSize: z.string(),
});
export type StreamJobsPathParameters = z.infer<typeof StreamJobsPathParameters>;

export class StreamJobsService extends AbstractService<NoBodyParams, StreamJobsPathParameters, string> {
  readonly type = ServiceType.enum.html;
  readonly method = HttpMethod.enum.get;
  readonly path = "/api/jobs/stream/filter/:filter/page/:page/size/:pageSize";
}

export const streamJobsService = new StreamJobsService(NoBodyParams, StreamJobsPathParameters, z.string());
