import z from "zod";

export const AppSettings = z.object({
  wordsPerMinuteOfAudio: z.number().int().min(1).default(4),
  minimumWords: z.number().int().min(1).default(300),
  maximumWords: z.number().int().min(1).default(2000),
  maxDirectAudioSeconds: z
    .number()
    .int()
    .min(1)
    .default(45 * 60),
  imageCandidatesPerPrompt: z.number().int().min(1).default(3),
  defaultSongExample: z
    .string()
    .min(1)
    .default(
      `Epic orchestral ballad, classical symphony, no percussion, no guitars, no modern/pop elements.\n\nMale baritone lead (deep and theatrical British accent, think James Earl Jones meets Alan Rickman, or Howard Shore's LOTR soloists).\nLarge SATB choir: grave, soaring harmonies-powerful yet mournful.\nInstrumentation: Full orchestra- deep cellos, violins, haunting strings, majestic pipe organ.\n\nSpeaking parts are given on some lines and should be spoken with a different voice as described.`,
    ),
  songModifiers: z
    .array(z.string().min(1))
    .default([
      "Slow and melodic without souring too high.",
      "Bard singing in a tavern.",
      "Incorporate folk instruments like acoustic guitar and violin.",
      "Evoke a sense of adventure and wonder.",
      "Orchestral background.",
      "Warm and inviting vocal tone.",
      "Storytelling style with a clear narrative.",
      "Use of minor chords to create a melancholic atmosphere.",
      "Incorporate natural sounds like birdsong or flowing water.",
    ]),
});
export type AppSettings = z.infer<typeof AppSettings>;

export const DEFAULT_APP_SETTINGS: AppSettings = AppSettings.parse({});
