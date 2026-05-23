import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { resumeJobService } from "../shared/service.resume-job.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { readJobDetail } from "./util.job-store.js";
import { resumePausedJobProcessing } from "./util.job-processing.js";

export class ResumeJobController extends AbstractController<NoBodyParams, JobPathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobPathParameters>): Promise<JobDetail> {
    await resumePausedJobProcessing(pathParams.jobId);
    return readJobDetail(pathParams.jobId);
  }
}

export const resumeJobController = new ResumeJobController(resumeJobService);
