import path from "path";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import multer from "multer";
import { Router } from "express";
import { CreateJobBodyParameters, createJobService } from "../shared/service.create-job.js";
import { RouteError } from "./main.errors.js";
import { createJob, getJobSourceDir, readJob, updateStage } from "./util.job-store.js";
import { startJobProcessing } from "./util.job-processing.js";

const incomingDir = path.join(process.cwd(), "data", "jobs", "_incoming");

const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    await fs.mkdir(incomingDir, { recursive: true });
    callback(null, incomingDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    callback(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({ storage });

export async function registerCreateJob(router: Router): Promise<void> {
  router.post(createJobService.path, upload.single("file"), async (req, res, next) => {
    try {
      if (!req.file) {
        throw new RouteError(400, "A file upload is required.");
      }

      const instructionsText = CreateJobBodyParameters.shape.instructionsText.parse(req.body.instructionsText);

      const job = await createJob(req.file.originalname, instructionsText);
      const extension = path.extname(req.file.originalname) || path.extname(req.file.filename) || ".mp3";
      const originalPath = path.join(getJobSourceDir(job.id), `original${extension.toLowerCase()}`);
      await fs.rename(req.file.path, originalPath);
      await updateStage(job.id, "upload", "completed", 100, "Upload stored.");

      await startJobProcessing(job.id, originalPath);
      res.json(await readJob(job.id));
    } catch (error) {
      next(error);
    }
  });
}