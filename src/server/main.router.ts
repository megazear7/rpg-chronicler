import express from "express";
import { clientController } from "./controller.client.js";
import { healthController } from "./controller.health.js";
import { exampleGenerationController } from "./controller.example-generation.js";
import { registerExampleDownload } from "./controller.example-download.js";
import { registerUploadReference } from "./controller.example-upload.js";
import { getAppConfigController } from "./controller.get-app-config.js";
import { registerCreateJob } from "./controller.create-job.js";
import { listJobsController } from "./controller.list-jobs.js";
import { getJobController } from "./controller.get-job.js";
import { registerJobStreams } from "./controller.job-streams.js";
import { getArtifactController } from "./controller.get-artifact.js";
import { updateArtifactController } from "./controller.update-artifact.js";
import { activateArtifactVersionController } from "./controller.activate-artifact-version.js";
import { deleteArtifactVersionController } from "./controller.delete-artifact-version.js";
import { sendJobToContentfulController } from "./controller.send-job-to-contentful.js";

const router = express.Router();

clientController.register(router);
healthController.register(router);
getAppConfigController.register(router);
exampleGenerationController.register(router);
registerUploadReference(router);
registerExampleDownload(router);
registerCreateJob(router);
listJobsController.register(router);
getJobController.register(router);
getArtifactController.register(router);
updateArtifactController.register(router);
activateArtifactVersionController.register(router);
deleteArtifactVersionController.register(router);
sendJobToContentfulController.register(router);
registerJobStreams(router);

export { router };
