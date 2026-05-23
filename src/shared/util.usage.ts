import { ModelConfigs } from "./type.model.js";
import { UsageBreakdown, UsageSummary } from "./type.prompt.js";

export type UsageModelKind = "text" | "audio" | "image";

export interface TokenUsageInput {
  inputTokens: number;
  outputTokens: number;
}

function roundCost(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function createEmptyUsageSummary(): UsageSummary {
  return UsageSummary.parse({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
  });
}

export function createEmptyUsageBreakdown(): UsageBreakdown {
  return UsageBreakdown.parse({
    text: createEmptyUsageSummary(),
    audio: createEmptyUsageSummary(),
    image: createEmptyUsageSummary(),
    total: createEmptyUsageSummary(),
  });
}

export function addUsageSummaries(left: UsageSummary, right: UsageSummary): UsageSummary {
  return UsageSummary.parse({
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    inputCost: roundCost(left.inputCost + right.inputCost),
    outputCost: roundCost(left.outputCost + right.outputCost),
    totalCost: roundCost(left.totalCost + right.totalCost),
  });
}

export function withUsageAdded(
  breakdown: UsageBreakdown,
  kind: UsageModelKind,
  increment: UsageSummary,
): UsageBreakdown {
  const updatedKind = addUsageSummaries(breakdown[kind], increment);
  return UsageBreakdown.parse({
    ...breakdown,
    [kind]: updatedKind,
    total: addUsageSummaries(breakdown.total, increment),
  });
}

export function usageSummaryFromTokens(
  usage: TokenUsageInput,
  rates: { inputTokenCost: number; outputTokenCost: number },
): UsageSummary {
  const inputCost = roundCost((usage.inputTokens * rates.inputTokenCost) / 1_000_000);
  const outputCost = roundCost((usage.outputTokens * rates.outputTokenCost) / 1_000_000);
  return UsageSummary.parse({
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.inputTokens + usage.outputTokens,
    inputCost,
    outputCost,
    totalCost: roundCost(inputCost + outputCost),
  });
}

export function usageBreakdownFromModelConfigs(model: ModelConfigs): UsageBreakdown {
  const text = usageSummaryFromTokens(
    {
      inputTokens: Math.max(model.text.usage.prompt_tokens, model.text.cost.inputTokenCount),
      outputTokens: Math.max(model.text.usage.completion_tokens, model.text.cost.outputTokenCount),
    },
    model.text.cost,
  );
  const audio = usageSummaryFromTokens(
    {
      inputTokens: Math.max(model.audio.usage.prompt_tokens, model.audio.cost.inputTokenCount),
      outputTokens: Math.max(model.audio.usage.completion_tokens, model.audio.cost.outputTokenCount),
    },
    model.audio.cost,
  );
  const imageConfig = model.image;
  const image = imageConfig
    ? usageSummaryFromTokens(
        {
          inputTokens: Math.max(imageConfig.usage.prompt_tokens, imageConfig.cost.inputTokenCount),
          outputTokens: Math.max(imageConfig.usage.completion_tokens, imageConfig.cost.outputTokenCount),
        },
        imageConfig.cost,
      )
    : createEmptyUsageSummary();

  return UsageBreakdown.parse({
    text,
    audio,
    image,
    total: addUsageSummaries(addUsageSummaries(text, audio), image),
  });
}

export function normalizeUsageBreakdown(value: unknown): UsageBreakdown {
  try {
    return UsageBreakdown.parse(value);
  } catch {
    return createEmptyUsageBreakdown();
  }
}
