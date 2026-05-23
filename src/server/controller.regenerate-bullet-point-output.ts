import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import {
  regenerateBulletPointOutputService,
  RegenerateBulletPointOutputPathParameters,
} from "../shared/service.regenerate-bullet-point-output.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { regenerateBulletPointOutput } from "./util.job-processing.js";

export class RegenerateBulletPointOutputController extends AbstractController<
  NoBodyParams,
  RegenerateBulletPointOutputPathParameters,
  JobDetail
> {
  async handler({
    pathParams,
  }: RequestOptions<NoBodyParams, RegenerateBulletPointOutputPathParameters>): Promise<JobDetail> {
    return regenerateBulletPointOutput(pathParams.jobId, pathParams.outputId);
  }
}

export const regenerateBulletPointOutputController = new RegenerateBulletPointOutputController(
  regenerateBulletPointOutputService,
);
