import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { restoreJobService } from "../shared/service.restore-job.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { readJobDetail, restoreJob } from "./util.job-store.js";

export class RestoreJobController extends AbstractController<NoBodyParams, JobPathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobPathParameters>): Promise<JobDetail> {
    await restoreJob(pathParams.jobId);
    return readJobDetail(pathParams.jobId);
  }
}

export const restoreJobController = new RestoreJobController(restoreJobService);
