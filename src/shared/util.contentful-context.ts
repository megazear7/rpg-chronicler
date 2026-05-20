import {
  ContentfulCatalog,
  ContentfulCharacterReference,
  ContentfulPlayerReference,
  ContentfulSubmissionSelection,
  DefaultContentfulSubmissionSelection,
} from "./type.contentful-context.js";

export function normalizeSubmissionSelection(
  selection?: Partial<ContentfulSubmissionSelection> | ContentfulSubmissionSelection | null,
): ContentfulSubmissionSelection {
  return ContentfulSubmissionSelection.parse({
    ...DefaultContentfulSubmissionSelection,
    ...(selection ?? {}),
    playerIds: selection?.playerIds ?? DefaultContentfulSubmissionSelection.playerIds,
    characterIds: selection?.characterIds ?? DefaultContentfulSubmissionSelection.characterIds,
    characterAssignments: selection?.characterAssignments ?? DefaultContentfulSubmissionSelection.characterAssignments,
    locationIds: selection?.locationIds ?? DefaultContentfulSubmissionSelection.locationIds,
    npcIds: selection?.npcIds ?? DefaultContentfulSubmissionSelection.npcIds,
    previousEventIds: selection?.previousEventIds ?? DefaultContentfulSubmissionSelection.previousEventIds,
  });
}

function findTitle<T extends { id: string; title: string }>(items: T[], ids: string[]): string[] {
  return ids
    .map((id) => items.find((item) => item.id === id)?.title)
    .filter((value): value is string => Boolean(value));
}

export function resolveSelectedCharacterAssignments(
  catalog: ContentfulCatalog | null,
  selection: ContentfulSubmissionSelection,
): Array<{ character: ContentfulCharacterReference; player: ContentfulPlayerReference | null }> {
  if (!catalog) {
    return [];
  }

  const assignmentByCharacterId = new Map(
    selection.characterAssignments.map((entry) => [entry.characterId, entry.playerId]),
  );
  const availablePlayerIds = new Set(catalog.players.map((entry) => entry.id));
  const selectedCharacters = selection.characterIds
    .map((characterId) => catalog.characters.find((entry) => entry.id === characterId) ?? null)
    .filter((entry): entry is ContentfulCharacterReference => Boolean(entry));

  const legacyPlayerIds = selection.playerIds ?? [];
  const usedLegacyPlayerIds = new Set<string>();
  const preservedDefaultAssignments = new Map<string, string>();

  if (legacyPlayerIds.length > 0) {
    for (const character of selectedCharacters) {
      if (
        assignmentByCharacterId.has(character.id) ||
        !character.playerId ||
        !legacyPlayerIds.includes(character.playerId) ||
        usedLegacyPlayerIds.has(character.playerId)
      ) {
        continue;
      }
      preservedDefaultAssignments.set(character.id, character.playerId);
      usedLegacyPlayerIds.add(character.playerId);
    }
  }

  const remainingLegacyPlayerIds = legacyPlayerIds.filter((entry) => !usedLegacyPlayerIds.has(entry));
  let remainingLegacyIndex = 0;

  return selectedCharacters.map((character) => {
    let playerId: string | null;
    const explicitAssignment = assignmentByCharacterId.get(character.id);
    const hasExplicitAssignment = assignmentByCharacterId.has(character.id);
    const hasValidExplicitAssignment =
      typeof explicitAssignment === "string" && availablePlayerIds.has(explicitAssignment);

    if (hasExplicitAssignment && explicitAssignment === null) {
      playerId = null;
    } else if (hasValidExplicitAssignment) {
      playerId = explicitAssignment;
    } else if (preservedDefaultAssignments.has(character.id)) {
      playerId = preservedDefaultAssignments.get(character.id) ?? null;
    } else if (legacyPlayerIds.length > 0) {
      playerId = remainingLegacyPlayerIds[remainingLegacyIndex] ?? null;
      remainingLegacyIndex += 1;
    } else if (character.playerId && availablePlayerIds.has(character.playerId)) {
      playerId = character.playerId;
    } else {
      playerId = character.playerId ?? null;
    }

    const player = playerId ? (catalog.players.find((entry) => entry.id === playerId) ?? null) : null;
    return { character, player };
  });
}

export function resolveSelectedPlayers(
  catalog: ContentfulCatalog | null,
  selection: ContentfulSubmissionSelection,
): ContentfulPlayerReference[] {
  const assignments = resolveSelectedCharacterAssignments(catalog, selection);
  const seen = new Set<string>();
  const players: ContentfulPlayerReference[] = [];

  for (const assignment of assignments) {
    if (!assignment.player || seen.has(assignment.player.id)) {
      continue;
    }
    seen.add(assignment.player.id);
    players.push(assignment.player);
  }

  return players;
}

export function formatCharacterAssignmentLine(
  character: Pick<ContentfulCharacterReference, "title" | "subtitle">,
  player: Pick<ContentfulPlayerReference, "title"> | null,
): string {
  const normalizedSubtitle = character.subtitle?.trim()
    ? `${character.subtitle.trim().charAt(0).toUpperCase()}${character.subtitle.trim().slice(1).toLowerCase()}`
    : null;
  const descriptor = normalizedSubtitle ? `: ${normalizedSubtitle}` : "";
  const playerText = player ? ` played by ${player.title}` : "";
  return ` - ${character.title}${descriptor}${playerText}`;
}

export function buildSelectionPreviewText(
  catalog: ContentfulCatalog | null,
  selection: ContentfulSubmissionSelection,
): string {
  if (!catalog) {
    return "";
  }

  const sections: string[] = [];
  const gameMaster = selection.gameMasterPlayerId
    ? (catalog.players.find((player) => player.id === selection.gameMasterPlayerId)?.title ?? null)
    : null;
  const characterAssignments = resolveSelectedCharacterAssignments(catalog, selection);
  const players = resolveSelectedPlayers(catalog, selection).map((player) => player.title);
  const locations = findTitle(catalog.locations, selection.locationIds);
  const npcs = findTitle(catalog.npcs, selection.npcIds);

  if (gameMaster) {
    sections.push(`Game master: ${gameMaster}`);
  }
  if (players.length > 0) {
    sections.push(`Players: ${players.join(", ")}`);
  }
  if (characterAssignments.length > 0) {
    sections.push(
      `Characters:\n${characterAssignments.map(({ character, player }) => formatCharacterAssignmentLine(character, player)).join("\n")}`,
    );
  }
  if (locations.length > 0) {
    sections.push(`Locations: ${locations.join(", ")}`);
  }
  if (npcs.length > 0) {
    sections.push(`NPCs: ${npcs.join(", ")}`);
  }

  return sections.join("\n\n");
}
