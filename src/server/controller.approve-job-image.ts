import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { approveJobImageService, JobImagePathParameters } from "../shared/service.approve-job-image.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { approveImageAsset } from "./util.job-store.js";

export class ApproveJobImageController extends AbstractController<NoBodyParams, JobImagePathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobImagePathParameters>): Promise<JobDetail> {
    return approveImageAsset(pathParams.jobId, pathParams.imageId);
  }
}

export const approveJobImageController = new ApproveJobImageController(approveJobImageService);