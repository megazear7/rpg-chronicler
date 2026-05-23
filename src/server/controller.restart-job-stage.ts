import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { RestartJobStagePathParameters, restartJobStageService } from "../shared/service.restart-job-stage.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { forceRestartJobProcessing } from "./util.job-processing.js";
import { readJobDetail } from "./util.job-store.js";

export class RestartJobStageController extends AbstractController<
  NoBodyParams,
  RestartJobStagePathParameters,
  JobDetail
> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, RestartJobStagePathParameters>): Promise<JobDetail> {
    await forceRestartJobProcessing(pathParams.jobId, pathParams.stageName);
    return readJobDetail(pathParams.jobId);
  }
}

export const restartJobStageController = new RestartJobStageController(restartJobStageService);
