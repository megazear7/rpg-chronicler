import { Command, CommanderError, Option } from "commander";
import {
  AudioReasoningEffort,
  SessionPresetId,
  SessionRunConfig,
  TextReasoningEffort,
} from "../shared/type.session.js";
import { formatSessionPresetList, getSessionPreset } from "../shared/util.session-presets.js";
import {
  castCollisionError,
  DEFAULT_AUDIO_MODEL,
  DEFAULT_AUDIO_REASONING_EFFORT,
  DEFAULT_BASE_URL,
  DEFAULT_CHUNK_MINUTES,
  DEFAULT_ENV_FILE,
  DEFAULT_TEXT_MODEL,
  DEFAULT_TEXT_REASONING_EFFORT,
  parseAliasList,
  resolveModelId,
  resolveOpenAiApiKey,
  SESSION_AUDIO_EXTENSIONS,
  SESSION_TASK_RULE,
  tableNameError,
} from "../shared/util.session.js";
import { loadSessionEnv, publicError, runSessionCli } from "./util.session-run.js";
import { CLI_VERSION } from "./version.js";

export type SessionInterpretation =
  | { type: "list-presets"; text: string }
  | { type: "run"; request: SessionRunConfig }
  | { type: "error"; message: string }
  | { type: "help"; text: string }
  | { type: "version"; text: string };

interface SessionCommandOptions {
  dm?: string;
  dmAlias?: string;
  instructions?: string;
  preset?: string;
  output?: string;
  dryRun?: boolean;
  listPresets?: boolean;
  audioModel?: string;
  audioReasoningEffort?: string;
  textModel?: string;
  reasoningEffort?: string;
  chunkMinutes?: string | number;
  baseUrl?: string;
  envFile?: string;
}

interface SeatInput {
  name?: string;
  alias?: string;
}

interface SessionCommandHooks {
  loadEnv: boolean;
  env: () => NodeJS.ProcessEnv;
  onInterpretation: (interpretation: SessionInterpretation) => Promise<void> | void;
}

const HELP_EXAMPLES = `
Instructions and presets:
  ${SESSION_TASK_RULE}

Players:
  --player-1 <name> --player-1-alias <a,b,c>
  --player-2 <name> --player-2-alias <a,b,c>
  Numbers start at 1 and cannot skip. Aliases are other names used at the table, usually character names.
  Names are a first name or table name, with no spaces and no last name.

Audio:
  The audio step streams each recording to ${DEFAULT_AUDIO_MODEL} over the OpenAI Realtime WebSocket.
  ffmpeg converts it to 24 kHz mono PCM. Long recordings are split with --chunk-minutes (default ${DEFAULT_CHUNK_MINUTES}).
  Override the model with --audio-model or OPENAI_AUDIO_MODEL. The text step uses ${DEFAULT_TEXT_MODEL} unless you set --text-model or OPENAI_TEXT_MODEL.
  The API key is read from OPENAI_API_KEY in the environment or the env file. It is never stored in the output.
  chronicle — ${getSessionPreset("chronicle").summary}
  --instructions are sent to the audio model while it listens. The chronicle preset uses that same listening path.

Examples:
  rpg-chronicler session session.mp3 --dm Alex --player-1 Sam --player-1-alias Elara --preset transcript
  rpg-chronicler session part1.mp3 part2.m4a --dm Alex --dm-alias "GM,Narrator" --player-1 Sam --player-1-alias Elara --player-2 Jordan --player-2-alias Thorin --preset comic --instructions "Keep it to 8 pages." --output ./session-output
  rpg-chronicler session --list-presets
  rpg-chronicler session session.mp3 --dm Alex --player-1 Sam --preset summary --dry-run

Supported recordings: ${SESSION_AUDIO_EXTENSIONS.join(", ")}
`;

export function addSessionCommand(program: Command, argv: string[], hooks: SessionCommandHooks): void {
  const collected = new Map<number, SeatInput>();
  const command = program
    .command("session")
    .description(
      "Turn tabletop RPG session recordings into a transcript, notes, a summary, a story, or a comic script.",
    )
    .argument("[audio...]", "Session recordings, in playback order.")
    .option("--dm <name>", "The DM's first name or table name.")
    .option("--dm-alias <aliases>", "Comma-separated aliases for the DM, such as GM or NPC voices.")
    .option(
      "--instructions <text>",
      "Free-text instructions. Required when --preset is omitted. Added on top of a preset when both are set.",
    )
    .option("--preset <name>", "Named task. See --list-presets.")
    .option("--list-presets", "Print the presets and exit.")
    .option("-o, --output <path>", "Output file, directory, or - for stdout. Default: session-output/")
    .option("--dry-run", "Validate the arguments and print the prompts without calling OpenAI.")
    .option("--audio-model <id>", `Realtime model that hears the audio. Default: ${DEFAULT_AUDIO_MODEL}.`)
    .addOption(
      new Option("--audio-reasoning-effort <level>", "Reasoning effort for the audio model. off omits it.")
        .choices(AudioReasoningEffort.options)
        .default(DEFAULT_AUDIO_REASONING_EFFORT),
    )
    .option("--text-model <id>", `Text model for the preset or extra instructions. Default: ${DEFAULT_TEXT_MODEL}.`)
    .addOption(
      new Option("--reasoning-effort <level>", "Reasoning effort for the text model. off omits it.")
        .choices(TextReasoningEffort.options)
        .default(DEFAULT_TEXT_REASONING_EFFORT),
    )
    .option(
      "--chunk-minutes <minutes>",
      `Split a recording into Realtime sessions of this many minutes. 0 sends the whole file in one session. Default: ${DEFAULT_CHUNK_MINUTES}.`,
    )
    .option("--base-url <url>", `OpenAI API base URL. Default: ${DEFAULT_BASE_URL}.`)
    .option("--env-file <path>", `Env file to load before reading OPENAI_API_KEY. Default: ${DEFAULT_ENV_FILE}.`)
    .version(CLI_VERSION, "-V, --version", "Print the CLI version.")
    .addHelpText("after", HELP_EXAMPLES);

  for (const index of playerOptionIndexes(sessionArgv(argv))) {
    command.option(`--player-${index} <name>`, playerNameHelp(index), (value: string) => {
      const seat = collected.get(index) ?? {};
      seat.name = value;
      collected.set(index, seat);
      return value;
    });
    command.option(
      `--player-${index}-alias <aliases>`,
      `Comma-separated aliases for player ${index}.`,
      (value: string) => {
        const seat = collected.get(index) ?? {};
        seat.alias = value;
        collected.set(index, seat);
        return value;
      },
    );
  }

  command.action(async (audio: string[] | undefined, options: SessionCommandOptions) => {
    const duplicate = duplicatePlayerFlagError(sessionArgv(argv));
    if (duplicate) {
      await hooks.onInterpretation({ type: "error", message: duplicate });
      return;
    }
    if (hooks.loadEnv) {
      loadSessionEnv(options.envFile ?? DEFAULT_ENV_FILE);
    }
    const interpretation = interpretSessionCommand(audio ?? [], options, collected, hooks.env());
    await hooks.onInterpretation(interpretation);
  });
}

export async function handleInterpretation(interpretation: SessionInterpretation): Promise<void> {
  if (interpretation.type === "list-presets") {
    console.log(interpretation.text);
    return;
  }
  if (interpretation.type === "error") {
    console.error(interpretation.message);
    process.exitCode = 1;
    return;
  }
  if (interpretation.type !== "run") {
    return;
  }
  try {
    await runSessionCli(interpretation.request);
  } catch (error) {
    console.error(publicError(error, resolveOpenAiApiKey(process.env)));
    process.exitCode = 1;
  }
}

export async function parseSessionArgv(argv: string[], env: NodeJS.ProcessEnv = {}): Promise<SessionInterpretation> {
  let output = "";
  let interpretation: SessionInterpretation | undefined;
  const program = new Command();
  program.name("rpg-chronicler");
  program.exitOverride();
  program.configureOutput({
    writeOut(text: string) {
      output += text;
    },
    writeErr(text: string) {
      output += text;
    },
  });
  const full = ["session", ...argv];
  addSessionCommand(program, full, {
    loadEnv: false,
    env: () => env,
    onInterpretation: (value) => {
      interpretation = value;
    },
  });
  try {
    await program.parseAsync(["node", "rpg-chronicler", ...full]);
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === "commander.helpDisplayed") {
        return { type: "help", text: output };
      }
      if (error.code === "commander.version") {
        return { type: "version", text: output };
      }
      return { type: "error", message: output.trim() || error.message };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { type: "error", message };
  }
  if (!interpretation) {
    return { type: "error", message: output.trim() || "The session command did not run." };
  }
  return interpretation;
}

export function interpretSessionCommand(
  audio: string[],
  options: SessionCommandOptions,
  collected: Map<number, SeatInput>,
  env: NodeJS.ProcessEnv,
): SessionInterpretation {
  if (options.listPresets) {
    return { type: "list-presets", text: formatSessionPresetList() };
  }
  if (audio.length === 0) {
    return {
      type: "error",
      message: [
        "Provide one or more audio files.",
        "Example: rpg-chronicler session session.mp3 --dm Alex --player-1 Sam --preset transcript",
      ].join("\n"),
    };
  }
  if (!options.dm?.trim()) {
    return {
      type: "error",
      message: 'Provide --dm with the DM\'s first name or table name. Example: --dm Alex --dm-alias "GM,Narrator"',
    };
  }
  const dmError = tableNameError(options.dm, "--dm");
  if (dmError) {
    return { type: "error", message: dmError };
  }
  const dmAliases = parseAliasList(options.dmAlias, "--dm-alias");
  if ("error" in dmAliases) {
    return { type: "error", message: dmAliases.error };
  }

  const indexes = [...collected.keys()].sort((left, right) => left - right);
  if (indexes.length === 0) {
    return {
      type: "error",
      message: "Provide at least one player. Example: --player-1 Sam --player-1-alias Elara",
    };
  }
  for (const index of indexes) {
    if (!Number.isInteger(index) || index < 1) {
      return { type: "error", message: `Player numbers start at 1. Received --player-${index}.` };
    }
  }
  for (let expected = 1; expected <= indexes.length; expected += 1) {
    if (indexes[expected - 1] !== expected) {
      return {
        type: "error",
        message: `Player numbers must start at 1 and cannot skip. Missing --player-${expected}.`,
      };
    }
  }

  const players = [];
  for (const index of indexes) {
    const seat = collected.get(index) ?? {};
    if (!seat.name?.trim()) {
      return {
        type: "error",
        message: seat.alias
          ? `--player-${index}-alias was set without --player-${index}.`
          : `Provide --player-${index} with that player's first name or table name.`,
      };
    }
    const nameError = tableNameError(seat.name, `--player-${index}`);
    if (nameError) {
      return { type: "error", message: nameError };
    }
    const aliases = parseAliasList(seat.alias, `--player-${index}-alias`);
    if ("error" in aliases) {
      return { type: "error", message: aliases.error };
    }
    players.push({ name: seat.name.trim(), aliases: aliases.aliases });
  }

  const cast = {
    dm: { name: options.dm.trim(), aliases: dmAliases.aliases },
    players,
  };
  const collision = castCollisionError(cast);
  if (collision) {
    return { type: "error", message: collision };
  }

  const instructions = options.instructions?.trim() || undefined;
  let presetId: SessionPresetId | undefined;
  if (options.preset?.trim()) {
    const normalized = options.preset.trim().toLowerCase();
    const match = SessionPresetId.options.find((id) => id === normalized);
    if (!match) {
      return {
        type: "error",
        message: `Unknown preset "${options.preset}". Presets: ${SessionPresetId.options.join(", ")}.\nRun with --list-presets for descriptions.`,
      };
    }
    presetId = match;
  }
  if (!presetId && !instructions) {
    return {
      type: "error",
      message: `Provide --preset or --instructions.\n${SESSION_TASK_RULE}\nRun with --list-presets to see the presets.`,
    };
  }
  if (instructions && instructions.length > 10_000) {
    return { type: "error", message: "--instructions is longer than 10000 characters." };
  }

  const chunkMinutes = readNumber(options.chunkMinutes, DEFAULT_CHUNK_MINUTES, "--chunk-minutes");
  if (typeof chunkMinutes !== "number") {
    return { type: "error", message: chunkMinutes.error };
  }
  if (chunkMinutes < 0 || chunkMinutes > 180) {
    return { type: "error", message: "--chunk-minutes must be between 0 and 180." };
  }

  const parsedAudioEffort = AudioReasoningEffort.safeParse(
    options.audioReasoningEffort ?? DEFAULT_AUDIO_REASONING_EFFORT,
  );
  if (!parsedAudioEffort.success) {
    return {
      type: "error",
      message: `--audio-reasoning-effort must be one of ${AudioReasoningEffort.options.join(", ")}.`,
    };
  }
  const parsedTextEffort = TextReasoningEffort.safeParse(options.reasoningEffort ?? DEFAULT_TEXT_REASONING_EFFORT);
  if (!parsedTextEffort.success) {
    return { type: "error", message: `--reasoning-effort must be one of ${TextReasoningEffort.options.join(", ")}.` };
  }

  const baseUrl = options.baseUrl?.trim() || DEFAULT_BASE_URL;
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { type: "error", message: "--base-url must start with http:// or https://." };
    }
  } catch {
    return { type: "error", message: `--base-url is not a URL: ${baseUrl}` };
  }

  const request = SessionRunConfig.safeParse({
    audioPaths: audio,
    cast,
    presetId,
    instructions,
    output: options.output?.trim() || undefined,
    dryRun: options.dryRun === true,
    audioModel: resolveModelId(options.audioModel, env.OPENAI_AUDIO_MODEL, DEFAULT_AUDIO_MODEL),
    audioReasoningEffort: parsedAudioEffort.data,
    textModel: resolveModelId(options.textModel, env.OPENAI_TEXT_MODEL, DEFAULT_TEXT_MODEL),
    reasoningEffort: parsedTextEffort.data,
    chunkMinutes,
    baseUrl,
    envFile: options.envFile?.trim() || DEFAULT_ENV_FILE,
  });
  if (!request.success) {
    return { type: "error", message: request.error.issues.map((issue) => issue.message).join("\n") };
  }
  return { type: "run", request: request.data };
}

function readNumber(value: string | number | undefined, fallback: number, label: string): number | { error: string } {
  if (value === undefined) {
    return fallback;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return { error: `${label} must be a number.` };
  }
  return parsed;
}

function sessionArgv(argv: string[]): string[] {
  const index = argv.findIndex((arg) => arg === "session");
  if (index === -1) {
    return [];
  }
  return argv.slice(index + 1);
}

function playerOptionIndexes(argv: string[]): number[] {
  const indexes = new Set<number>([1]);
  for (const arg of argv) {
    const flag = /^--player-(\d+)(?:-alias)?$/u.exec(arg.split("=")[0]);
    if (!flag) {
      continue;
    }
    const index = Number(flag[1]);
    if (Number.isInteger(index)) {
      indexes.add(index);
    }
  }
  return [...indexes].sort((left, right) => left - right);
}

function duplicatePlayerFlagError(argv: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const arg of argv) {
    const name = arg.split("=")[0];
    if (!/^--player-\d+(?:-alias)?$/u.test(name)) {
      continue;
    }
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  for (const [name, count] of counts) {
    if (count > 1) {
      return `${name} was provided ${count} times. Pass it once.`;
    }
  }
  return undefined;
}

function playerNameHelp(index: number): string {
  if (index === 1) {
    return "Player 1's first name or table name. Add --player-2, --player-3, and so on for more players.";
  }
  return `Player ${index}'s first name or table name.`;
}
