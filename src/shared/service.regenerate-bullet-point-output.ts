import z from "zod";
import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobDetail } from "./type.job.js";

export const RegenerateBulletPointOutputPathParameters = z.object({
  jobId: z.uuid(),
  outputId: z.string().min(1),
});
export type RegenerateBulletPointOutputPathParameters = z.infer<typeof RegenerateBulletPointOutputPathParameters>;

export class RegenerateBulletPointOutputService extends AbstractService<
  NoBodyParams,
  RegenerateBulletPointOutputPathParameters,
  JobDetail
> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.post;
  readonly path = "/api/jobs/:jobId/bullet-points/:outputId/regenerate";
}

export const regenerateBulletPointOutputService = new RegenerateBulletPointOutputService(
  NoBodyParams,
  RegenerateBulletPointOutputPathParameters,
  JobDetail,
);
