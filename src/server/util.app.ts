import { AppConfig } from "../shared/type.app.js";
import { promises as fs } from "fs";
import { fileExists } from "./util.fs.js";
import { RouteError } from "./main.errors.js";
import { normalizeInstructionConfig } from "../shared/util.instructions.js";
import { normalizeSubmissionSelection } from "../shared/util.contentful-context.js";
import { usageBreakdownFromModelConfigs } from "../shared/util.usage.js";

const DEFAULT_MODEL_CONFIG = {
  text: {
    name: "grok",
    endpoint: "https://api.x.ai/v1",
    modelName: "grok-4.3",
    cost: {
      inputTokenCost: 3,
      inputTokenCount: 0,
      outputTokenCost: 15,
      outputTokenCount: 0,
    },
    usage: {
      completion_tokens: 0,
      prompt_tokens: 0,
    },
  },
  audio: {
    name: "openai",
    endpoint: "https://api.openai.com/v1",
    modelName: "gpt-4o-audio-preview-2025-06-03",
    cost: {
      inputTokenCost: 2.5,
      inputTokenCount: 0,
      outputTokenCost: 64,
      outputTokenCount: 0,
    },
    usage: {
      completion_tokens: 0,
      prompt_tokens: 0,
    },
  },
  image: {
    name: "openai",
    endpoint: "https://api.openai.com/v1",
    modelName: "gpt-image-1",
    cost: {
      inputTokenCost: 0,
      inputTokenCount: 0,
      outputTokenCost: 0,
      outputTokenCount: 0,
    },
    usage: {
      completion_tokens: 0,
      prompt_tokens: 0,
    },
  },
} as const;

function normalizeModelConfig(model: unknown): AppConfig["model"] {
  const base = typeof model === "object" && model !== null ? (model as Record<string, unknown>) : {};
  return {
    text: {
      ...DEFAULT_MODEL_CONFIG.text,
      ...(typeof base.text === "object" && base.text !== null ? base.text : {}),
    },
    audio: {
      ...DEFAULT_MODEL_CONFIG.audio,
      ...(typeof base.audio === "object" && base.audio !== null ? base.audio : {}),
    },
    image: {
      ...DEFAULT_MODEL_CONFIG.image,
      ...(typeof base.image === "object" && base.image !== null ? base.image : {}),
    },
  };
}

export const getAppConfig = async (): Promise<AppConfig> => {
  const path = "data/app/index.json";
  const exists = await fileExists(path);
  if (!exists) throw new RouteError(404, "App config does not exist.");
  const data = await fs.readFile(path, "utf-8");
  const json = JSON.parse(data);
  return AppConfig.parse({
    ...json,
    model: normalizeModelConfig(json.model),
    usage: json.usage ?? usageBreakdownFromModelConfigs(normalizeModelConfig(json.model)),
    instructions: normalizeInstructionConfig(json.instructions),
    submissionDefaults: normalizeSubmissionSelection(json.submissionDefaults),
    latestSubmission: normalizeSubmissionSelection(json.latestSubmission ?? json.submissionDefaults),
  });
};

export const saveAppConfig = async (app: AppConfig): Promise<void> => {
  const path = "data/app/index.json";
  await fs.mkdir("data/app", { recursive: true });
  const normalized = AppConfig.parse({
    ...app,
    model: normalizeModelConfig(app.model),
    usage: app.usage,
    instructions: normalizeInstructionConfig(app.instructions),
    submissionDefaults: normalizeSubmissionSelection(app.submissionDefaults),
    latestSubmission: normalizeSubmissionSelection(app.latestSubmission ?? app.submissionDefaults),
  });
  await fs.writeFile(path, JSON.stringify(normalized, null, 2), "utf-8");
};
