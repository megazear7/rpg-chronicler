import { SessionCast, SessionPresetId, TableName } from "./type.session.js";

/**
 * Exact OpenAI model id for GPT Realtime 2.1.
 * The session CLI sends this on the Realtime WebSocket unless --audio-model or OPENAI_AUDIO_MODEL overrides it.
 */
export const DEFAULT_AUDIO_MODEL = "gpt-realtime-2.1";

/** Text model used after the audio step to write the preset or follow extra instructions. */
export const DEFAULT_TEXT_MODEL = "gpt-6.2-sol";

export const DEFAULT_AUDIO_REASONING_EFFORT = "low";
export const DEFAULT_TEXT_REASONING_EFFORT = "medium";
export const DEFAULT_CHUNK_MINUTES = 10;
export const DEFAULT_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_ENV_FILE = ".env";
export const DEFAULT_OUTPUT_DIRECTORY = "session-output";
export const TRANSCRIPT_PART_CHAR_BUDGET = 80_000;
export const SPEAKER_TAIL_LINES = 40;
export const REALTIME_SAMPLE_RATE = 24_000;
export const REALTIME_PCM_BYTES_PER_SECOND = REALTIME_SAMPLE_RATE * 2;

export const SESSION_AUDIO_EXTENSIONS = [
  ".flac",
  ".m4a",
  ".mp3",
  ".mp4",
  ".mpeg",
  ".mpga",
  ".ogg",
  ".wav",
  ".webm",
] as const;

export const SESSION_TASK_RULE =
  "Pass --preset, --instructions, or both. One of them is required. A preset selects the task. --instructions can be used instead of a preset, or added on top of one. When both are set, the preset stays the task and the extra instructions refine it. If they conflict, follow the extra instructions as long as the preset's format still holds.";

export class SessionCliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionCliError";
  }
}

export function isSessionAudioExtension(extension: string): boolean {
  return (SESSION_AUDIO_EXTENSIONS as readonly string[]).includes(extension.toLowerCase());
}

export function tableNameError(name: string, label: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return `${label} is empty.`;
  }
  if (/\s/u.test(trimmed)) {
    return `${label} must be a first name or table name only, with no spaces or last name. Received "${trimmed}".`;
  }
  const parsed = TableName.safeParse(trimmed);
  if (!parsed.success) {
    return `${label} may use letters, numbers, apostrophes, and hyphens only, up to 40 characters. Received "${trimmed}".`;
  }
  return undefined;
}

export function parseAliasList(value: string | undefined, label: string): { aliases: string[] } | { error: string } {
  if (value === undefined || value.trim().length === 0) {
    return { aliases: [] };
  }
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    return { error: `${label} is empty. Pass comma-separated names, or omit the flag.` };
  }
  const aliases: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    if (part.length > 80) {
      return { error: `${label} entry "${part}" is longer than 80 characters.` };
    }
    if (/[\r\n]/u.test(part)) {
      return { error: `${label} entries must be single-line names.` };
    }
    const key = part.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    aliases.push(part);
  }
  return { aliases };
}

export function castCollisionError(cast: SessionCast): string | undefined {
  const seen = new Map<string, string>();
  const consider = (label: string, value: string): string | undefined => {
    const key = value.toLocaleLowerCase();
    const previous = seen.get(key);
    if (previous) {
      return `"${value}" is used for both ${previous} and ${label}. Each person and alias needs a distinct name.`;
    }
    seen.set(key, label);
    return undefined;
  };

  const dmNameError = consider(`${cast.dm.name}'s name`, cast.dm.name);
  if (dmNameError) {
    return dmNameError;
  }
  for (const alias of cast.dm.aliases) {
    const aliasError = consider(`${cast.dm.name}'s alias`, alias);
    if (aliasError) {
      return aliasError;
    }
  }
  for (const player of cast.players) {
    const nameError = consider(`${player.name}'s name`, player.name);
    if (nameError) {
      return nameError;
    }
    for (const alias of player.aliases) {
      const aliasError = consider(`${player.name}'s alias`, alias);
      if (aliasError) {
        return aliasError;
      }
    }
  }
  return undefined;
}

export function formatCast(cast: SessionCast): string {
  const dmAliases = cast.dm.aliases.length > 0 ? ` (aliases: ${cast.dm.aliases.join(", ")})` : "";
  const players = cast.players
    .map((player, index) => {
      const aliases = player.aliases.length > 0 ? ` (aliases: ${player.aliases.join(", ")})` : "";
      return `Player ${index + 1}: ${player.name}${aliases}`;
    })
    .join("\n");
  return `DM: ${cast.dm.name}${dmAliases}\n${players}`;
}

export function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface PlannedChunk {
  index: number;
  startSeconds: number;
  durationSeconds: number | null;
}

/**
 * Split a recording into clips the Realtime model can hear in one session.
 * A chunkMinutes value of 0 keeps the whole file in one session.
 * A null duration means the length is unknown, so the file stays in one session.
 */
export function planSessionChunks(durationSeconds: number | null, chunkMinutes: number): PlannedChunk[] {
  if (durationSeconds === null || chunkMinutes === 0 || durationSeconds <= chunkMinutes * 60) {
    return [{ index: 0, startSeconds: 0, durationSeconds }];
  }
  const chunkSeconds = chunkMinutes * 60;
  const chunks: PlannedChunk[] = [];
  let start = 0;
  while (start < durationSeconds - 0.25) {
    const duration = Math.min(chunkSeconds, durationSeconds - start);
    chunks.push({ index: chunks.length, startSeconds: start, durationSeconds: duration });
    start += duration;
  }
  return chunks;
}

export function describeChunk(chunk: PlannedChunk, chunkCount: number): string {
  if (chunk.durationSeconds === null) {
    return `chunk ${chunk.index + 1} of ${chunkCount}, whole file (duration unknown)`;
  }
  if (chunkCount === 1 && chunk.startSeconds === 0) {
    return `chunk 1 of 1, ${formatTimestamp(0)} to ${formatTimestamp(chunk.durationSeconds)}`;
  }
  const end = chunk.startSeconds + chunk.durationSeconds;
  return `chunk ${chunk.index + 1} of ${chunkCount}, ${formatTimestamp(chunk.startSeconds)} to ${formatTimestamp(end)}`;
}

export function transcriptTail(transcript: string, lines: number): string {
  const kept = transcript
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .slice(-lines);
  return kept.join("\n");
}

export function splitTranscript(transcript: string, maxChars: number): string[] {
  if (transcript.length <= maxChars) {
    return [transcript];
  }
  const lines = transcript.split("\n");
  const parts: string[] = [];
  let current: string[] = [];
  let length = 0;
  for (const line of lines) {
    const nextLength = length + line.length + 1;
    if (nextLength > maxChars && current.length > 0) {
      parts.push(current.join("\n"));
      current = [];
      length = 0;
    }
    current.push(line);
    length += line.length + 1;
  }
  if (current.length > 0) {
    parts.push(current.join("\n"));
  }
  return parts;
}

export function taskWritesNamedTranscriptDirectly(
  presetId: SessionPresetId | undefined,
  instructions: string | undefined,
): boolean {
  return presetId === "transcript" && !instructions;
}

export function stripModelFences(text: string): string {
  const trimmed = text.trim();
  const match = /^```[a-z]*\n([\s\S]*?)\n```$/i.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

export function scrubSecret(message: string, secret: string | undefined): string {
  if (!secret || secret.length < 8) {
    return message;
  }
  return message.split(secret).join("[redacted]");
}

export function resolveOpenAiApiKey(env: NodeJS.ProcessEnv): string | undefined {
  const value = env.OPENAI_API_KEY;
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveModelId(flag: string | undefined, envValue: string | undefined, fallback: string): string {
  const fromFlag = flag?.trim();
  if (fromFlag) {
    return fromFlag;
  }
  const fromEnv = envValue?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return fallback;
}

export function realtimeWebSocketUrl(baseUrl: string, model: string): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "http:" ? "ws:" : "wss:";
  const path = url.pathname.endsWith("/") ? `${url.pathname}realtime` : `${url.pathname}/realtime`;
  url.pathname = path;
  url.search = "";
  url.searchParams.set("model", model);
  return url.toString();
}

export function renderSessionMarkdown(input: {
  title: string;
  sourcePaths: string[];
  cast: SessionCast;
  presetId?: SessionPresetId;
  instructions?: string;
  audioModel: string;
  textModel: string;
  body: string;
}): string {
  const castLines = formatCast(input.cast)
    .split("\n")
    .map((line) => (line.startsWith("- ") ? line : `- ${line}`));
  const lines = [
    `# ${input.title}`,
    "",
    `- Sources: ${input.sourcePaths.join(", ")}`,
    ...castLines,
    `- Preset: ${input.presetId ?? "(none)"}`,
    `- Extra instructions: ${input.instructions ?? "(none)"}`,
    `- Audio model: ${input.audioModel}`,
    "- Audio API: OpenAI Realtime WebSocket",
    `- Text model: ${input.textModel}`,
    "",
    "---",
    "",
    input.body.trim(),
    "",
  ];
  return lines.join("\n");
}
