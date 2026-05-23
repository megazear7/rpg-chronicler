import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { readJobDetail } from "./util.job-store.js";
import { rerunJobStageProcessing } from "./util.job-processing.js";
import { rerunJobStageService, RerunJobStagePathParameters } from "../shared/service.rerun-job-stage.js";

export class RerunJobStageController extends AbstractController<NoBodyParams, RerunJobStagePathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, RerunJobStagePathParameters>): Promise<JobDetail> {
    await rerunJobStageProcessing(pathParams.jobId, pathParams.stageName);
    return readJobDetail(pathParams.jobId);
  }
}

export const rerunJobStageController = new RerunJobStageController(rerunJobStageService);
