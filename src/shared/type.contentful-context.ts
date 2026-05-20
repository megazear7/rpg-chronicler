import z from "zod";

export const ContentfulEntityType = z.enum(["adventure", "event", "player", "character", "location", "npc"]);
export type ContentfulEntityType = z.infer<typeof ContentfulEntityType>;

export const ContentfulReference = z.object({
  id: z.string().min(1),
  type: ContentfulEntityType,
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type ContentfulReference = z.infer<typeof ContentfulReference>;

export const ContentfulAdventureReference = ContentfulReference.extend({
  type: z.literal("adventure"),
  eventIds: z.array(z.string().min(1)).default([]),
});
export type ContentfulAdventureReference = z.infer<typeof ContentfulAdventureReference>;

export const ContentfulEventReference = ContentfulReference.extend({
  type: z.literal("event"),
  adventureId: z.string().min(1).nullable().optional(),
  summary: z.string().nullable().optional(),
  ordering: z.number().int().nullable().optional(),
  year: z.number().int().nullable().optional(),
  month: z.string().nullable().optional(),
  day: z.number().int().nullable().optional(),
});
export type ContentfulEventReference = z.infer<typeof ContentfulEventReference>;

export const ContentfulPlayerReference = ContentfulReference.extend({
  type: z.literal("player"),
});
export type ContentfulPlayerReference = z.infer<typeof ContentfulPlayerReference>;

export const ContentfulCharacterReference = ContentfulReference.extend({
  type: z.literal("character"),
  playerId: z.string().min(1).nullable().optional(),
});
export type ContentfulCharacterReference = z.infer<typeof ContentfulCharacterReference>;

export const ContentfulCharacterAssignment = z.object({
  characterId: z.string().min(1),
  playerId: z.string().min(1).nullable(),
});
export type ContentfulCharacterAssignment = z.infer<typeof ContentfulCharacterAssignment>;

export const ContentfulLocationReference = ContentfulReference.extend({
  type: z.literal("location"),
});
export type ContentfulLocationReference = z.infer<typeof ContentfulLocationReference>;

export const ContentfulNpcReference = ContentfulReference.extend({
  type: z.literal("npc"),
});
export type ContentfulNpcReference = z.infer<typeof ContentfulNpcReference>;

export const ContentfulCatalog = z.object({
  adventures: z.array(ContentfulAdventureReference),
  events: z.array(ContentfulEventReference),
  players: z.array(ContentfulPlayerReference),
  characters: z.array(ContentfulCharacterReference),
  locations: z.array(ContentfulLocationReference),
  npcs: z.array(ContentfulNpcReference),
  refreshedAt: z.string().datetime(),
});
export type ContentfulCatalog = z.infer<typeof ContentfulCatalog>;

export const ContentfulSubmissionSelection = z.object({
  adventureId: z.string().min(1).nullable(),
  gameMasterPlayerId: z.string().min(1).nullable(),
  playerIds: z.array(z.string().min(1)).default([]),
  characterIds: z.array(z.string().min(1)),
  characterAssignments: z.array(ContentfulCharacterAssignment),
  locationIds: z.array(z.string().min(1)),
  npcIds: z.array(z.string().min(1)),
  previousEventIds: z.array(z.string().min(1)),
  year: z.number().int().nullable().optional(),
  month: z.string().nullable().optional(),
  day: z.number().int().nullable().optional(),
});
export type ContentfulSubmissionSelection = z.infer<typeof ContentfulSubmissionSelection>;

export const ContentfulCharacterAssignmentSnapshot = z.object({
  character: ContentfulCharacterReference,
  player: ContentfulPlayerReference.nullable(),
});
export type ContentfulCharacterAssignmentSnapshot = z.infer<typeof ContentfulCharacterAssignmentSnapshot>;

export const ContentfulSubmissionSnapshot = z.object({
  selection: ContentfulSubmissionSelection,
  adventure: ContentfulAdventureReference.nullable(),
  gameMaster: ContentfulPlayerReference.nullable(),
  players: z.array(ContentfulPlayerReference),
  characters: z.array(ContentfulCharacterReference),
  characterAssignments: z.array(ContentfulCharacterAssignmentSnapshot),
  locations: z.array(ContentfulLocationReference),
  npcs: z.array(ContentfulNpcReference),
  previousEvents: z.array(ContentfulEventReference),
});
export type ContentfulSubmissionSnapshot = z.infer<typeof ContentfulSubmissionSnapshot>;

export const DefaultContentfulSubmissionSelection = ContentfulSubmissionSelection.parse({
  adventureId: null,
  gameMasterPlayerId: null,
  playerIds: [],
  characterIds: [],
  characterAssignments: [],
  locationIds: [],
  npcIds: [],
  previousEventIds: [],
  year: null,
  month: null,
  day: null,
});

export const SearchContentfulEventsBody = z.object({
  query: z.string().trim(),
});
export type SearchContentfulEventsBody = z.infer<typeof SearchContentfulEventsBody>;
