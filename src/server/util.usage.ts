import { CompletionUsage } from "openai/resources";
import { JobStageName } from "../shared/type.job.js";
import { ModelConfigs } from "../shared/type.model.js";
import { UsageModelKind, usageSummaryFromTokens, withUsageAdded } from "../shared/util.usage.js";
import { getAppConfig, saveAppConfig } from "./util.app.js";
import { updateJob } from "./util.job-store.js";

interface RecordModelUsageOptions {
  modelKind: UsageModelKind;
  modelConfigs?: ModelConfigs;
  usage: Pick<CompletionUsage, "prompt_tokens" | "completion_tokens">;
  jobId?: string;
  stageName?: JobStageName;
}

export async function recordModelUsage({
  modelKind,
  modelConfigs,
  usage,
  jobId,
  stageName,
}: RecordModelUsageOptions): Promise<void> {
  const inputTokens = usage.prompt_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? 0;
  if (inputTokens <= 0 && outputTokens <= 0) {
    return;
  }

  const appConfig = await getAppConfig();
  if (modelConfigs) {
    appConfig.model = modelConfigs;
  }

  const modelConfig = appConfig.model[modelKind];
  if (!modelConfig) {
    return;
  }

  const increment = usageSummaryFromTokens(
    {
      inputTokens,
      outputTokens,
    },
    modelConfig.cost,
  );

  modelConfig.usage.prompt_tokens += inputTokens;
  modelConfig.usage.completion_tokens += outputTokens;
  modelConfig.cost.inputTokenCount += inputTokens;
  modelConfig.cost.outputTokenCount += outputTokens;
  appConfig.usage = withUsageAdded(appConfig.usage, modelKind, increment);
  await saveAppConfig(appConfig);

  if (!jobId || !stageName) {
    return;
  }

  await updateJob(jobId, (job) => ({
    ...job,
    usage: withUsageAdded(job.usage, modelKind, increment),
    stages: job.stages.map((stage) =>
      stage.name === stageName
        ? {
            ...stage,
            usage: withUsageAdded(stage.usage, modelKind, increment),
          }
        : stage,
    ),
  }));
}
