import { SessionPresetId } from "./type.session.js";

export interface SessionPresetDefinition {
  id: SessionPresetId;
  title: string;
  summary: string;
  instructions: string;
  combineInstructions: string;
  /** "audio" means gpt-realtime follows these instructions while it listens. "text" is written afterward. */
  delivery: "audio" | "text";
}

const combineDefault =
  "Combine the partial drafts below into one finished piece. Keep the same job as the original task. Drop repeated setup from later parts. Do not add events that are not in the drafts.";

export const sessionPresets = {
  transcript: {
    id: "transcript",
    title: "Transcript",
    summary: "A readable transcript that names the DM and each player, including character and NPC voices.",
    delivery: "text",
    instructions: `Produce a readable transcript of this tabletop RPG session with speaker attribution.
Keep the words that were said. Lightly add punctuation so it can be read.
Attribute every turn to the person who said it, using the cast names.
When a player is speaking as their character, write "Name (as Character):".
When the DM is narrating or speaking as an NPC, write "Name (DM):" or "Name (DM, as NPC):".
Keep table talk, rules calls, and jokes.
Use the timestamps already in the source at the start of each turn.
If a stretch is unintelligible, write [unintelligible] instead of guessing.
Do not add a title, preamble, or closing note.`,
    combineInstructions:
      "Join the partial transcripts in order. Do not rewrite spoken words. You may remove a repeated sentence at a boundary if both drafts include it.",
  },
  "play-by-play": {
    id: "play-by-play",
    title: "Play-by-play",
    summary:
      "A chronological account of what the people at the table did, in player names rather than character names.",
    delivery: "text",
    instructions: `Write a chronological play-by-play of what the people at the table did.
Refer to real player and DM names, not character names, except when a character name is needed to explain what that person did in the game.
Use short sentences and simple language a game master can scan later.
Cover decisions, scene changes, combat turns, rules calls, and jokes that changed what the table did.
Skip small talk that did not affect play, and skip individual dice totals unless the roll changed the outcome.
Do not turn this into in-world prose.
Do not add a preamble.`,
    combineInstructions: combineDefault,
  },
  summary: {
    id: "summary",
    title: "Session summary",
    summary: "A few paragraphs for a campaign log: how the session started, the turning points, and how it ended.",
    delivery: "text",
    instructions: `Write a session summary a campaign log can keep.
Use a few short paragraphs. Open with how the session started, then the turning points, then how it ended.
Use player names for what the people did and character names for what happened in the world.
Include a few memorable lines, quoted briefly.
Skip routine dice math and repeated rules lookups.
Do not add a preamble or a title.`,
    combineInstructions: combineDefault,
  },
  "dm-notes": {
    id: "dm-notes",
    title: "DM notes",
    summary: "Notes the DM needs next session: NPCs, loot, promises, open hooks, and where the party stopped.",
    delivery: "text",
    instructions: `Write notes the DM can use to prepare the next session.
Cover NPCs who appeared, changed, or died; loot, debts, and promises; facts the party learned; hooks that are still open; and anything the DM still needs to track.
Describe the party's location and situation at the end in enough detail to pick the scene back up.
Use short paragraphs and lists where a list is easier to scan.
Do not retell the whole session. Keep only what the DM needs next time.
Do not add a preamble.`,
    combineInstructions: combineDefault,
  },
  story: {
    id: "story",
    title: "Story",
    summary: "Narrative prose of what happened in the game world, using character names and no table talk.",
    delivery: "text",
    instructions: `Write a narrative story of what happened in the game world.
Use character names, not the players' real names. Treat the DM's narration and NPC dialogue as the world, and treat player dialogue as the words and choices of their characters.
Write prose paragraphs. Do not mention dice, rules, table talk, or that this was a game.
Do not write like a model. Write like a good fantasy author telling this session's events.
Avoid words that AI writing often leans on, such as shadowy, whisper, rhythm, and threads.
Do not add a title or a preamble.`,
    combineInstructions: combineDefault,
  },
  comic: {
    id: "comic",
    title: "Comic script",
    summary:
      "A Knights of the Dinner Table style comic script about this group at the table, not a straight retelling of the plot.",
    delivery: "text",
    instructions: `Write a comic script in the spirit of Knights of the Dinner Table: a gag comic about this group at the table, not a straight adaptation of the fantasy plot.
The characters are the DM and players, drawn as ordinary people with dice, minis, snacks, and rulebooks. Use their real names.
In-world events belong in caption boxes and in the DM's narration. The humor comes from how the group reacts: rules arguments, bad rolls, spotlight stealing, and running jokes.
Format the script like this:

PAGE 1
PANEL 1
Setting: ...
NAME: dialogue
CAPTION: ...

Use as many pages and panels as the session earns. Keep dialogue speakable. Do not copy characters, jokes, or panels from existing comics.
Do not add a preamble before PAGE 1.`,
    combineInstructions:
      "Combine the partial comic scripts into one script. Renumber pages and panels from the start. Keep the jokes that are in the drafts. Do not add new scenes.",
  },
  chronicle: {
    id: "chronicle",
    title: "Chronicle",
    summary:
      "A listening-time chronicle of who said what, rolls and rulings, names, story beats, and funny table moments.",
    delivery: "audio",
    instructions: `Listen to this clip and write a chronicle of the tabletop session as you hear it.
Use the DM and player names, and their aliases, to attribute every line to the right person.
Mark in-character speech separately from table talk.
Mark DM narration separately from NPC voices the DM performs.
Note dice rolls, rules calls, and the outcomes of those calls.
Capture NPCs, places, items, and loot by the names used in the session.
Flag key story beats, decisions, jokes, and memorable funny moments at the table, because those moments are useful for a Knights of the Dinner Table style comic.
Keep the chronicle in chronological order, and start each entry with a rough timestamp from the start of this clip.
When the audio is unclear, say plainly that it is unclear instead of guessing.
Do not add a title or a preamble.`,
    combineInstructions:
      "Chronicle clips are already written by the audio model. Keep them in order and do not add events.",
  },
} satisfies Record<SessionPresetId, SessionPresetDefinition>;

export function isListeningPreset(id: SessionPresetId): boolean {
  return sessionPresets[id].delivery === "audio";
}

export function getSessionPreset(id: SessionPresetId): SessionPresetDefinition {
  return sessionPresets[id];
}

export function formatSessionPresetList(): string {
  const entries = SessionPresetId.options.map((id) => {
    const preset = sessionPresets[id];
    return `  ${preset.id}\n    ${preset.summary}`;
  });
  return [
    "Presets",
    "",
    ...entries,
    "",
    "Pass --preset <name>. --instructions can be used instead of a preset, or added on top of one.",
    "When both are set, the preset is the task and --instructions adds guidance.",
  ].join("\n");
}
