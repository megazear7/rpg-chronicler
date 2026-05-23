import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { generateJobImageService } from "../shared/service.generate-job-image.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { readJobDetail, saveGeneratedImageAsset, updateJob, updateStage } from "./util.job-store.js";
import { generateImageFromPrompt } from "./util.image.js";
import { RouteError } from "./main.errors.js";

export class GenerateJobImageController extends AbstractController<NoBodyParams, JobPathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobPathParameters>): Promise<JobDetail> {
    const current = await readJobDetail(pathParams.jobId);
    if (current.image.prompts.length === 0) {
      throw new RouteError(400, "Image prompts must be available before generating images.");
    }

    await updateJob(pathParams.jobId, (job) => ({
      ...job,
      image: {
        ...job.image,
        status: "generating",
      },
    }));

    for (let index = 0; index < current.image.prompts.length; index += 1) {
      const prompt = current.image.prompts[index];
      const { buffer, mimeType } = await generateImageFromPrompt(prompt.prompt, {
        jobId: pathParams.jobId,
        stageName: "image_generation",
      });
      await saveGeneratedImageAsset(pathParams.jobId, prompt.id, prompt.prompt, buffer, mimeType, "generated");
      await updateStage(
        pathParams.jobId,
        "image_generation",
        "running",
        Math.round(((index + 1) / current.image.prompts.length) * 100),
        `Generated image ${index + 1} of ${current.image.prompts.length} for ${prompt.storyPart}.`,
      );
    }

    await updateJob(pathParams.jobId, (job) => ({
      ...job,
      image: {
        ...job.image,
        status: "awaiting_approval",
      },
    }));
    await updateStage(pathParams.jobId, "image_generation", "completed", 100, "Generated image candidates.");
    await updateStage(
      pathParams.jobId,
      "image_approval",
      "running",
      0,
      `Review ${current.image.prompts.length} generated images and approve or reject each.`,
    );
    return readJobDetail(pathParams.jobId);
  }
}

export const generateJobImageController = new GenerateJobImageController(generateJobImageService);
