import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { restartJobService } from "../shared/service.restart-job.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { readJobDetail } from "./util.job-store.js";
import { restartFailedJobProcessing } from "./util.job-processing.js";

export class RestartJobController extends AbstractController<NoBodyParams, JobPathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobPathParameters>): Promise<JobDetail> {
    await restartFailedJobProcessing(pathParams.jobId);
    return readJobDetail(pathParams.jobId);
  }
}

export const restartJobController = new RestartJobController(restartJobService);
