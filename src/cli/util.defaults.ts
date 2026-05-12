import { ModelTypeConfig } from "../shared/type.model.js";
import { ModelTypeOption } from "./type.cli.js";

export const defaults: Record<ModelTypeOption, ModelTypeConfig> = {
  [ModelTypeOption.enum.grok]: {
    name: "grok",
    endpoint: "https://api.x.ai/v1",
    modelName: "grok-4-0709",
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
  [ModelTypeOption.enum.openai]: {
    name: "openai",
    endpoint: "https://api.openai.com/v1",
    modelName: "gpt-audio-2025-08-28",
    cost: {
      inputTokenCost: 2.5,
      inputTokenCount: 0,
      outputTokenCost: 64.0,
      outputTokenCount: 0,
    },
    usage: {
      completion_tokens: 0,
      prompt_tokens: 0,
    },
  },
  [ModelTypeOption.enum.ollama]: {
    name: "ollama",
    endpoint: "http://localhost:11434/v1",
    modelName: "qwen3:4b",
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
  [ModelTypeOption.enum.custom]: {
    name: "custom",
    endpoint: "",
    modelName: "",
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
};
