import { AppConfig } from "../shared/type.app";
import { createEmptyUsageBreakdown } from "../shared/util.usage.js";
import { defaults } from "./util.defaults.js";

export const standardAppConfig: AppConfig = {
  model: {
    text: defaults.grok,
    audio: defaults.openai,
  },
  usage: createEmptyUsageBreakdown(),
};
