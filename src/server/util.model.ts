import OpenAI from "openai";
import { ModelConfigs, ModelTypeName } from "../shared/type.model.js";
import { ONE_DAY_IN_MS } from "../shared/util.time.js";

export const MODEL_ENV_POSTFIX = "_MODEL_API_KEY";

export async function modelNames(): Promise<ModelTypeName[]> {
  return Object.keys(process.env)
    .filter((key) => key.endsWith(MODEL_ENV_POSTFIX))
    .map((key) => ModelTypeName.parse(key.replace(MODEL_ENV_POSTFIX, "")));
}

export async function loadTextClient(modelConfigs: ModelConfigs): Promise<OpenAI> {
  return new OpenAI({
    apiKey: process.env[`${modelConfigs.text.name.toUpperCase()}${MODEL_ENV_POSTFIX}`],
    baseURL: modelConfigs.text.endpoint,
    timeout: ONE_DAY_IN_MS,
  });
}

export async function loadAudioClient(modelConfigs: ModelConfigs): Promise<OpenAI> {
  return new OpenAI({
    apiKey: process.env[`${modelConfigs.audio.name.toUpperCase()}${MODEL_ENV_POSTFIX}`],
    baseURL: modelConfigs.audio.endpoint,
    timeout: ONE_DAY_IN_MS,
  });
}
