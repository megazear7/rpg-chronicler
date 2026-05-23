import z from "zod";
import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { ListJobsPathParameters, listJobsService } from "../shared/service.list-jobs.js";
import { JobListFilter, JobListResponse } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { listJobs } from "./util.job-store.js";

export class ListJobsController extends AbstractController<NoBodyParams, ListJobsPathParameters, JobListResponse> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, ListJobsPathParameters>): Promise<JobListResponse> {
    return listJobs(
      z.coerce.number().int().positive().parse(pathParams.page),
      z.coerce.number().int().positive().parse(pathParams.pageSize),
      JobListFilter.parse(pathParams.filter),
    );
  }
}

export const listJobsController = new ListJobsController(listJobsService);
