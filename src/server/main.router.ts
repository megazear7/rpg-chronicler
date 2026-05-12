import express from "express";
import { clientController } from "./controller.client.js";
import { healthController } from "./controller.health.js";
import { exampleGenerationController } from "./controller.example-generation.js";
import { registerExampleDownload } from "./controller.example-download.js";
import { registerUploadReference } from "./controller.example-upload.js";
import { getAppConfigController } from "./controller.get-app-config.js";

const router = express.Router();

clientController.register(router);
healthController.register(router);
getAppConfigController.register(router);
exampleGenerationController.register(router);
registerUploadReference(router);
registerExampleDownload(router);

export { router };
