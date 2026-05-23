import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { pauseJobService } from "../shared/service.pause-job.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { readJobDetail } from "./util.job-store.js";
import { pauseActiveJobProcessing } from "./util.job-processing.js";

export class PauseJobController extends AbstractController<NoBodyParams, JobPathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobPathParameters>): Promise<JobDetail> {
    await pauseActiveJobProcessing(pathParams.jobId);
    return readJobDetail(pathParams.jobId);
  }
}

export const pauseJobController = new PauseJobController(pauseJobService);
