import z from "zod";
import { ModelConfigs, ModelTypeConfig } from "./type.model.js";
import { Cost, Usage, UsageBreakdown } from "./type.prompt.js";
import { InstructionConfig } from "./type.instructions.js";
import { ContentfulSubmissionSelection } from "./type.contentful-context.js";

export const AppConfig = z.object({
  model: ModelConfigs,
  usage: UsageBreakdown,
  instructions: InstructionConfig.optional(),
  submissionDefaults: ContentfulSubmissionSelection.optional(),
  latestSubmission: ContentfulSubmissionSelection.optional(),
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
      image: ModelTypeConfig.partial()
        .extend({
          cost: Cost.partial().optional(),
          usage: Usage.partial().optional(),
        })
        .optional(),
    })
    .optional(),
  usage: UsageBreakdown.partial()
    .extend({
      text: UsageBreakdown.shape.text.partial().optional(),
      audio: UsageBreakdown.shape.audio.partial().optional(),
      image: UsageBreakdown.shape.image.partial().optional(),
      total: UsageBreakdown.shape.total.partial().optional(),
    })
    .optional(),
  instructions: InstructionConfig.partial()
    .extend({
      players: InstructionConfig.shape.players.optional(),
      characters: InstructionConfig.shape.characters.optional(),
      storyElements: InstructionConfig.shape.storyElements.optional(),
      defaults: InstructionConfig.shape.defaults.partial().optional(),
    })
    .optional(),
  submissionDefaults: ContentfulSubmissionSelection.partial().optional(),
  latestSubmission: ContentfulSubmissionSelection.partial().optional(),
});
export type AppConfigPartial = z.infer<typeof AppConfigPartial>;
