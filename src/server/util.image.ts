import { getAppConfig } from "./util.app.js";
import { loadImageClient } from "./util.model.js";
import { JobStageName } from "../shared/type.job.js";
import { recordModelUsage } from "./util.usage.js";

interface ImageUsageTrackingContext {
  jobId?: string;
  stageName?: JobStageName;
}

export async function generateImageFromPrompt(
  prompt: string,
  usageTracking?: ImageUsageTrackingContext,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const appConfig = await getAppConfig();
  if (!appConfig.model.image) {
    throw new Error("Image model configuration is missing.");
  }

  const client = await loadImageClient(appConfig.model);
  const response = await client.images.generate({
    model: appConfig.model.image.modelName,
    prompt,
    size: "1536x1024",
  });

  const responseWithUsage = response as {
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      input_tokens?: number;
      output_tokens?: number;
    };
  };
  await recordModelUsage({
    modelKind: "image",
    modelConfigs: appConfig.model,
    usage: {
      prompt_tokens: responseWithUsage.usage?.prompt_tokens ?? responseWithUsage.usage?.input_tokens ?? 0,
      completion_tokens: responseWithUsage.usage?.completion_tokens ?? responseWithUsage.usage?.output_tokens ?? 0,
    },
    jobId: usageTracking?.jobId,
    stageName: usageTracking?.stageName,
  });

  const payload = response.data?.[0]?.b64_json;
  if (!payload) {
    throw new Error("Image model did not return image data.");
  }

  return {
    buffer: Buffer.from(payload, "base64"),
    mimeType: "image/png",
  };
}
