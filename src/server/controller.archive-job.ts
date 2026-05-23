import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { archiveJobService } from "../shared/service.archive-job.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { archiveJob, readJobDetail } from "./util.job-store.js";

export class ArchiveJobController extends AbstractController<NoBodyParams, JobPathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobPathParameters>): Promise<JobDetail> {
    await archiveJob(pathParams.jobId);
    return readJobDetail(pathParams.jobId);
  }
}

export const archiveJobController = new ArchiveJobController(archiveJobService);
