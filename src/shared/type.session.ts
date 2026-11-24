import z from "zod";

export const SESSION_PRESET_IDS = [
  "transcript",
  "play-by-play",
  "summary",
  "dm-notes",
  "story",
  "comic",
  "chronicle",
] as const;

export const SessionPresetId = z.enum(SESSION_PRESET_IDS);
export type SessionPresetId = z.infer<typeof SessionPresetId>;

export const TableName = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N}'’._-]*$/u, "Use a first name or table name only, with no spaces or last name.");

export type TableName = z.infer<typeof TableName>;

export const Alias = z.string().min(1).max(80);
export type Alias = z.infer<typeof Alias>;

export const Participant = z.object({
  name: TableName,
  aliases: z.array(Alias),
});
export type Participant = z.infer<typeof Participant>;

export const CharacterDetails = z.object({
  name: z.string().min(1).max(80),
  race: z.string().min(1).max(80),
  className: z.string().min(1).max(80),
});
export type CharacterDetails = z.infer<typeof CharacterDetails>;

export const PlayerSeat = Participant.extend({
  character: CharacterDetails,
});
export type PlayerSeat = z.infer<typeof PlayerSeat>;

export const SessionCast = z.object({
  dm: Participant,
  players: z.array(PlayerSeat).min(1),
});
export type SessionCast = z.infer<typeof SessionCast>;

const ProperNouns = z.array(z.string().min(1).max(80)).default(() => []);

export const AudioReasoningEffort = z.enum(["minimal", "low", "medium", "high", "xhigh", "off"]);
export type AudioReasoningEffort = z.infer<typeof AudioReasoningEffort>;

export const TextReasoningEffort = z.enum(["low", "medium", "high", "xhigh", "max", "off"]);
export type TextReasoningEffort = z.infer<typeof TextReasoningEffort>;

export const SessionRunConfig = z.object({
  audioPaths: z.array(z.string().min(1)).min(1),
  cast: SessionCast,
  presetId: SessionPresetId.optional(),
  instructions: z.string().min(1).optional(),
  output: z.string().min(1).optional(),
  dryRun: z.boolean(),
  audioModel: z.string().min(1),
  audioReasoningEffort: AudioReasoningEffort,
  textModel: z.string().min(1),
  reasoningEffort: TextReasoningEffort,
  chunkMinutes: z.number().min(0).max(180),
  baseUrl: z.string().url(),
  envFile: z.string().min(1),
  names: ProperNouns,
});
export type SessionRunConfig = z.infer<typeof SessionRunConfig>;

export const SessionSpeakerPromptInput = z.object({
  cast: SessionCast,
  names: ProperNouns,
  chunkLabel: z.string().min(1),
  previousTail: z.string().optional(),
  presetId: SessionPresetId.optional(),
  instructions: z.string().min(1).optional(),
});
export type SessionSpeakerPromptInput = z.infer<typeof SessionSpeakerPromptInput>;

export const SessionPromptPart = z.object({
  index: z.number().int().positive(),
  count: z.number().int().positive(),
});
export type SessionPromptPart = z.infer<typeof SessionPromptPart>;

export const SessionProducePromptInput = z.object({
  mode: z.literal("produce"),
  cast: SessionCast,
  names: ProperNouns,
  presetId: SessionPresetId.optional(),
  instructions: z.string().min(1).optional(),
  transcript: z.string().min(1),
  part: SessionPromptPart.optional(),
});
export type SessionProducePromptInput = z.infer<typeof SessionProducePromptInput>;

export const SessionCombinePromptInput = z.object({
  mode: z.literal("combine"),
  cast: SessionCast,
  names: ProperNouns,
  presetId: SessionPresetId.optional(),
  instructions: z.string().min(1).optional(),
  partials: z.array(z.string().min(1)).min(2),
});
export type SessionCombinePromptInput = z.infer<typeof SessionCombinePromptInput>;

export const SessionPromptInput = z.discriminatedUnion("mode", [SessionProducePromptInput, SessionCombinePromptInput]);
export type SessionPromptInput = z.infer<typeof SessionPromptInput>;
