import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { generateJobImageService } from "../shared/service.generate-job-image.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { readArtifact, readJobDetail, saveGeneratedImageAsset, updateJob, updateStage } from "./util.job-store.js";
import { generateImageFromPrompt } from "./util.image.js";
import { RouteError } from "./main.errors.js";

export class GenerateJobImageController extends AbstractController<NoBodyParams, JobPathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobPathParameters>): Promise<JobDetail> {
    const imagePrompt = await readArtifact(pathParams.jobId, "imagePrompt");
    const prompt = imagePrompt.activeVersion?.text?.trim();
    if (!prompt) {
      throw new RouteError(400, "Image prompt must be available before generating an image.");
    }

    await updateJob(pathParams.jobId, (job) => ({
      ...job,
      image: {
        ...job.image,
        status: "generating",
      },
    }));
    await updateStage(pathParams.jobId, "image_generation", "running", 25, "Generating a new image candidate.");
    const { buffer, mimeType } = await generateImageFromPrompt(prompt);
    await saveGeneratedImageAsset(pathParams.jobId, prompt, buffer, mimeType, "generated");
    await updateStage(pathParams.jobId, "image_generation", "completed", 100, "Generated a new image candidate.");
    await updateStage(
      pathParams.jobId,
      "image_approval",
      "running",
      50,
      "Review the image prompt and approve an image candidate.",
    );
    return readJobDetail(pathParams.jobId);
  }
}

export const generateJobImageController = new GenerateJobImageController(generateJobImageService);
