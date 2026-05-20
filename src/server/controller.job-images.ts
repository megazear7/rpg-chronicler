import { Router } from "express";
import { JobImagePathParameters } from "../shared/service.approve-job-image.js";
import { parseRouteParams } from "../shared/util.route-params.js";
import { getJobImagePath, readJob } from "./util.job-store.js";
import { RouteError } from "./main.errors.js";

export const JOB_IMAGE_PATH = "/api/jobs/:jobId/images/:imageId";

export async function registerJobImages(router: Router): Promise<void> {
  router.get(JOB_IMAGE_PATH, async (req, res, next) => {
    try {
      const params = JobImagePathParameters.parse(parseRouteParams(JOB_IMAGE_PATH, req.path));
      const job = await readJob(params.jobId);
      const asset = job.image.generatedAssets.find((entry) => entry.id === params.imageId);
      if (!asset) {
        throw new RouteError(404, "Image not found.");
      }
      res.setHeader("Content-Type", asset.mimeType);
      res.sendFile(getJobImagePath(params.jobId, asset.fileName));
    } catch (error) {
      next(error);
    }
  });
}
