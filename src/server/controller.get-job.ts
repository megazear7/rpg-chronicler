import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { getJobService, JobPathParameters } from "../shared/service.get-job.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { readJobDetail } from "./util.job-store.js";

export class GetJobController extends AbstractController<NoBodyParams, JobPathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobPathParameters>): Promise<JobDetail> {
    return readJobDetail(pathParams.jobId);
  }
}

export const getJobController = new GetJobController(getJobService);
