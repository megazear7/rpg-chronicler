import z from "zod";

export const InstructionEntryId = z.string().min(1);
export type InstructionEntryId = z.infer<typeof InstructionEntryId>;

export const InstructionIntro = z.string().min(1);
export type InstructionIntro = z.infer<typeof InstructionIntro>;

export const InstructionPlayer = z.object({
  id: InstructionEntryId,
  name: z.string().min(1),
  description: z.string().default(""),
});
export type InstructionPlayer = z.infer<typeof InstructionPlayer>;

export const InstructionCharacter = z.object({
  id: InstructionEntryId,
  name: z.string().min(1),
  race: z.string().min(1),
  className: z.string().min(1),
  defaultPlayerId: InstructionEntryId.nullable(),
});
export type InstructionCharacter = z.infer<typeof InstructionCharacter>;

export const InstructionStoryElement = z.object({
  id: InstructionEntryId,
  name: z.string().min(1),
  description: z.string().default(""),
});
export type InstructionStoryElement = z.infer<typeof InstructionStoryElement>;

export const InstructionCharacterSelection = z.object({
  characterId: InstructionEntryId,
  playerId: InstructionEntryId.nullable(),
});
export type InstructionCharacterSelection = z.infer<typeof InstructionCharacterSelection>;

export const InstructionSelection = z.object({
  gameMasterPlayerId: InstructionEntryId.nullable(),
  playerIds: z.array(InstructionEntryId),
  characterSelections: z.array(InstructionCharacterSelection),
  storyElementIds: z.array(InstructionEntryId),
});
export type InstructionSelection = z.infer<typeof InstructionSelection>;

export const InstructionConfig = z.object({
  intro: InstructionIntro,
  players: z.array(InstructionPlayer),
  characters: z.array(InstructionCharacter),
  storyElements: z.array(InstructionStoryElement),
  defaults: InstructionSelection,
});
export type InstructionConfig = z.infer<typeof InstructionConfig>;

export const DEFAULT_INSTRUCTION_CONFIG = InstructionConfig.parse({
  intro:
    "You are an expert game master and writer specializing in tabletop roleplaying games. You create session reports that are clear, concise, and useful for game masters. You also write engaging narrative summaries that capture the essence of the characters and story.",
  players: [
    {
      id: "player-harper",
      name: "Harper",
      description: "Campaign organizer and usual rules arbiter.",
    },
    {
      id: "player-rowan",
      name: "Rowan",
      description: "Tactical player who likes frontline characters.",
    },
    {
      id: "player-jules",
      name: "Jules",
      description: "Roleplay-focused player who enjoys stealth and intrigue.",
    },
    {
      id: "player-mira",
      name: "Mira",
      description: "Puzzle-solving player with a preference for arcane characters.",
    },
  ],
  characters: [
    {
      id: "character-bram",
      name: "Bram",
      race: "Human",
      className: "Guardian",
      defaultPlayerId: "player-rowan",
    },
    {
      id: "character-sera",
      name: "Sera",
      race: "Elf",
      className: "Shadow",
      defaultPlayerId: "player-jules",
    },
    {
      id: "character-iva",
      name: "Iva",
      race: "Gnome",
      className: "Scholar",
      defaultPlayerId: "player-mira",
    },
  ],
  storyElements: [
    {
      id: "story-emberfall",
      name: "Emberfall",
      description: "A frontier town with a buried ruin beneath the chapel.",
    },
    {
      id: "story-obsidian-sigil",
      name: "Obsidian Sigil",
      description: "A dangerous relic tied to the central mystery.",
    },
  ],
  defaults: {
    gameMasterPlayerId: "player-harper",
    playerIds: ["player-harper", "player-rowan", "player-jules", "player-mira"],
    characterSelections: [
      {
        characterId: "character-bram",
        playerId: "player-rowan",
      },
      {
        characterId: "character-sera",
        playerId: "player-jules",
      },
      {
        characterId: "character-iva",
        playerId: "player-mira",
      },
    ],
    storyElementIds: ["story-emberfall", "story-obsidian-sigil"],
  },
});
