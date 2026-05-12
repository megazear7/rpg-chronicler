import z from "zod";
import { ModelConfigs, ModelTypeConfig } from "./type.model.js";
import { Cost, Usage } from "./type.prompt.js";

export const AppConfig = z.object({
  model: ModelConfigs,
});
export type AppConfig = z.infer<typeof AppConfig>;

export const AppConfigPartial = AppConfig.partial().extend({
  model: ModelConfigs.partial()
    .extend({
      text: ModelTypeConfig.partial()
        .extend({
          cost: Cost.partial().optional(),
          usage: Usage.partial().optional(),
        })
        .optional(),
      audio: ModelTypeConfig.partial()
        .extend({
          cost: Cost.partial().optional(),
          usage: Usage.partial().optional(),
        })
        .optional(),
    })
    .optional(),
});
export type AppConfigPartial = z.infer<typeof AppConfigPartial>;
