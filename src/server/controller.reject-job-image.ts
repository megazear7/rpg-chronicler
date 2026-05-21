import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { JobDetail } from "../shared/type.job.js";
import { rejectJobImageService } from "../shared/service.reject-job-image.js";
import { JobImagePathParameters } from "../shared/service.approve-job-image.js";
import { AbstractController } from "./main.controller.js";
import { rejectImageAsset } from "./util.job-store.js";

export class RejectJobImageController extends AbstractController<NoBodyParams, JobImagePathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobImagePathParameters>): Promise<JobDetail> {
    return rejectImageAsset(pathParams.jobId, pathParams.imageId);
  }
}

export const rejectJobImageController = new RejectJobImageController(rejectJobImageService);
