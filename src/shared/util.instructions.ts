import {
  DEFAULT_INSTRUCTION_CONFIG,
  InstructionCharacter,
  InstructionConfig,
  InstructionPlayer,
  InstructionSelection,
  InstructionStoryElement,
} from "./type.instructions.js";

function formatNamedDetail(name: string, description: string): string {
  return description.trim().length > 0 ? ` - ${name}: ${description.trim()}` : ` - ${name}`;
}

function findPlayer(config: InstructionConfig, playerId: string | null): InstructionPlayer | null {
  return playerId ? config.players.find((player) => player.id === playerId) ?? null : null;
}

function findCharacter(config: InstructionConfig, characterId: string): InstructionCharacter | null {
  return config.characters.find((character) => character.id === characterId) ?? null;
}

function findStoryElement(config: InstructionConfig, storyElementId: string): InstructionStoryElement | null {
  return config.storyElements.find((storyElement) => storyElement.id === storyElementId) ?? null;
}

export function normalizeInstructionConfig(config?: Partial<InstructionConfig> | null): InstructionConfig {
  return InstructionConfig.parse({
    ...DEFAULT_INSTRUCTION_CONFIG,
    ...config,
    defaults: {
      ...DEFAULT_INSTRUCTION_CONFIG.defaults,
      ...(config?.defaults ?? {}),
    },
  });
}

export function buildInstructionText(config: InstructionConfig, selection: InstructionSelection = config.defaults): string {
  const gameMaster = findPlayer(config, selection.gameMasterPlayerId);
  const players = selection.playerIds
    .map((playerId) => findPlayer(config, playerId))
    .filter((player): player is InstructionPlayer => player !== null);
  const characterLines = selection.characterSelections
    .map((entry) => {
      const character = findCharacter(config, entry.characterId);
      if (!character) {
        return null;
      }
      const player = findPlayer(config, entry.playerId ?? character.defaultPlayerId);
      const playedBy = player ? ` played by ${player.name}` : "";
      return ` - ${character.name}: ${character.race} ${character.className}${playedBy}`;
    })
    .filter((line): line is string => Boolean(line));
  const storyElements = selection.storyElementIds
    .map((storyElementId) => findStoryElement(config, storyElementId))
    .filter((storyElement): storyElement is InstructionStoryElement => storyElement !== null);

  const sections = [config.intro.trim()];

  if (gameMaster) {
    sections.push(["The game master is:", formatNamedDetail(gameMaster.name, gameMaster.description)].join("\n"));
  }

  if (players.length > 0) {
    sections.push(["The players are:", ...players.map((player) => formatNamedDetail(player.name, player.description))].join("\n"));
  }

  if (characterLines.length > 0) {
    sections.push(["The characters are:", ...characterLines].join("\n"));
  }

  if (storyElements.length > 0) {
    sections.push([
      "Some story elements to be aware of:",
      ...storyElements.map((storyElement) => formatNamedDetail(storyElement.name, storyElement.description)),
    ].join("\n"));
  }

  return sections.join("\n\n");
}