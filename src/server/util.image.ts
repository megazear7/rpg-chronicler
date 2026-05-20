import { getAppConfig } from "./util.app.js";
import { loadImageClient } from "./util.model.js";

export async function generateImageFromPrompt(prompt: string): Promise<{ buffer: Buffer; mimeType: string }> {
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

  const payload = response.data?.[0]?.b64_json;
  if (!payload) {
    throw new Error("Image model did not return image data.");
  }

  return {
    buffer: Buffer.from(payload, "base64"),
    mimeType: "image/png",
  };
}
