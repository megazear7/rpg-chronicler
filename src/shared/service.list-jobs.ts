import z from "zod";
import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobListResponse } from "./type.job.js";

export const ListJobsPathParameters = z.object({
  page: z.string(),
  pageSize: z.string(),
});
export type ListJobsPathParameters = z.infer<typeof ListJobsPathParameters>;

export class ListJobsService extends AbstractService<NoBodyParams, ListJobsPathParameters, JobListResponse> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.get;
  readonly path = "/api/jobs/page/:page/size/:pageSize";
}

export const listJobsService = new ListJobsService(NoBodyParams, ListJobsPathParameters, JobListResponse);
