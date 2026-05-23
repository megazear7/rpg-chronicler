import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { generateJobImageService } from "../shared/service.generate-job-image.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { readJobDetail, saveGeneratedImageAsset, updateJob, updateStage } from "./util.job-store.js";
import { generateImageFromPrompt } from "./util.image.js";
import { RouteError } from "./main.errors.js";

const IMAGE_CANDIDATES_PER_PROMPT = 3;

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

    const totalImages = current.image.prompts.length * IMAGE_CANDIDATES_PER_PROMPT;
    let generatedCount = 0;

    for (let promptIndex = 0; promptIndex < current.image.prompts.length; promptIndex += 1) {
      const prompt = current.image.prompts[promptIndex];
      for (let candidateIndex = 0; candidateIndex < IMAGE_CANDIDATES_PER_PROMPT; candidateIndex += 1) {
        const { buffer, mimeType } = await generateImageFromPrompt(prompt.prompt, {
          jobId: pathParams.jobId,
          stageName: "image_generation",
        });
        await saveGeneratedImageAsset(pathParams.jobId, prompt.id, prompt.prompt, buffer, mimeType, "generated");
        generatedCount += 1;
        await updateStage(
          pathParams.jobId,
          "image_generation",
          "running",
          Math.round((generatedCount / totalImages) * 100),
          `Generated image ${candidateIndex + 1} of ${IMAGE_CANDIDATES_PER_PROMPT} for ${prompt.storyPart}.`,
        );
      }
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
      `Review ${totalImages} generated images and approve or reject each.`,
    );
    return readJobDetail(pathParams.jobId);
  }
}

export const generateJobImageController = new GenerateJobImageController(generateJobImageService);
