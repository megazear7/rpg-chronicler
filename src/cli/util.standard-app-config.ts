import { AppConfig } from "../shared/type.app";
import { defaults } from "./util.defaults.js";

export const standardAppConfig: AppConfig = {
  model: {
    text: defaults.grok,
    audio: defaults.openai,
  },
};
