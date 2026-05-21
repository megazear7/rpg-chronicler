import { Router } from "express";
import z from "zod";
import { parseRouteParams } from "../shared/util.route-params.js";
import { RouteError } from "./main.errors.js";
import { getJobAudioPartsDir, getJobSourceDir, listJobAudioFiles } from "./util.job-store.js";

const JobAudioPathParameters = z.object({
  jobId: z.uuid(),
  audioFileName: z.string().min(1),
});

export const JOB_AUDIO_PATH = "/api/jobs/:jobId/audio/:audioFileName";

export async function registerJobAudio(router: Router): Promise<void> {
  router.get(JOB_AUDIO_PATH, async (req, res, next) => {
    try {
      const params = JobAudioPathParameters.parse(parseRouteParams(JOB_AUDIO_PATH, req.path));
      const audioFiles = await listJobAudioFiles(params.jobId);
      const audioFile = audioFiles.find((entry) => entry.fileName === params.audioFileName);
      if (!audioFile) {
        throw new RouteError(404, "Audio file not found.");
      }

      res.setHeader("Content-Type", "audio/mpeg");
      const filePath =
        audioFile.kind === "prepared"
          ? `${getJobSourceDir(params.jobId)}/${audioFile.fileName}`
          : `${getJobAudioPartsDir(params.jobId)}/${audioFile.fileName}`;
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  });
}
