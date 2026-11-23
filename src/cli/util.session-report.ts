import type { ChatCompletionMessageParam } from "openai/resources";
import { SessionRunConfig } from "../shared/type.session.js";
import { sessionPrompt } from "../shared/prompt.session.js";
import { sessionSpeakerPrompt } from "../shared/prompt.session-speakers.js";
import { getSessionPreset, isListeningPreset } from "../shared/util.session-presets.js";
import {
  describeChunk,
  formatBytes,
  formatCast,
  formatTimestamp,
  planSessionChunks,
  realtimeWebSocketUrl,
  SESSION_TASK_RULE,
  taskWritesNamedTranscriptDirectly,
} from "../shared/util.session.js";
import type { AudioFileFact } from "./util.session-files.js";
import { describeOutputPlan, planSessionOutput } from "./util.session-output.js";

export interface DryRunReportInput {
  request: SessionRunConfig;
  files: AudioFileFact[];
  apiKey: "set" | "missing";
  outputIsDirectory: boolean;
}

export async function buildDryRunReport(input: DryRunReportInput): Promise<{ ok: boolean; text: string }> {
  const warnings: string[] = [];
  const fileLines: string[] = [];
  for (const file of input.files) {
    const chunks = planSessionChunks(file.durationSeconds, input.request.chunkMinutes);
    if (file.probeError) {
      warnings.push(
        `${file.path}: duration could not be read (${file.probeError}). A live run will send it as one Realtime session if ffmpeg can decode it.`,
      );
    }
    const duration = file.durationSeconds === null ? "duration unknown" : formatTimestamp(file.durationSeconds);
    const chunkText = chunks.map((chunk) => describeChunk(chunk, chunks.length)).join("; ");
    fileLines.push(`  - ${file.path} — ${formatBytes(file.sizeBytes)}, ${duration}, ${chunkText}`);
  }

  const preset = input.request.presetId ? getSessionPreset(input.request.presetId) : undefined;
  const speakerMessages = await sessionSpeakerPrompt({
    cast: input.request.cast,
    chunkLabel: "a dry-run placeholder clip",
    previousTail: undefined,
    presetId: input.request.presetId,
    instructions: input.request.instructions,
  });
  const listening = input.request.presetId ? isListeningPreset(input.request.presetId) : false;
  const direct = taskWritesNamedTranscriptDirectly(input.request.presetId, input.request.instructions);
  const placeholder = dryRunPlaceholderTranscript(input.request);
  const taskMessages =
    !listening && (input.request.presetId || input.request.instructions)
      ? await sessionPrompt({
          mode: "produce",
          cast: input.request.cast,
          presetId: input.request.presetId,
          instructions: input.request.instructions,
          transcript: placeholder,
        })
      : [];
  const output = planSessionOutput({
    output: input.request.output,
    presetId: input.request.presetId,
    instructions: input.request.instructions,
    outputIsDirectory: input.outputIsDirectory,
  });

  const lines = [
    "Dry run. No audio was uploaded and no OpenAI request was made.",
    "",
    "Cast",
    formatCast(input.request.cast)
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n"),
    "",
    "Task",
    `  Preset: ${preset ? `${preset.id} — ${preset.summary}` : "(none)"}`,
    `  Extra instructions: ${input.request.instructions ?? "(none)"}`,
    `  ${SESSION_TASK_RULE}`,
    listening
      ? "  This preset is followed by the audio model while it listens. The text model is not called."
      : direct
        ? "  The transcript preset with no extra instructions writes the named transcript and does not call the text model."
        : "  The text model runs after the audio model, using the named transcript.",
    "",
    "Models",
    `  Audio: ${input.request.audioModel}`,
    `  Audio API: Realtime WebSocket ${realtimeWebSocketUrl(input.request.baseUrl, input.request.audioModel)}`,
    "  Audio format: 24 kHz mono PCM16, streamed with input_audio_buffer.append",
    `  Audio reasoning: ${input.request.audioReasoningEffort}`,
    `  Text: ${input.request.textModel} (reasoning effort: ${input.request.reasoningEffort})`,
    `  OPENAI_API_KEY: ${input.apiKey === "set" ? "set" : "missing"}`,
    "",
    "Files",
    ...fileLines,
    "",
    `Output: ${describeOutputPlan(output)}`,
    "",
    "Speaker prompt sent as the Realtime session instructions",
    renderMessages(speakerMessages),
    "",
    "Task prompt",
    listening
      ? "Not sent. The audio model writes this result while it listens. The preset text is in the Realtime instructions above."
      : direct
        ? "Assembled below for review. It is not sent when the preset is transcript and there are no extra instructions."
        : "Sent to the text model after the named transcript is ready. The transcript below is a placeholder.",
    "",
    renderMessages(taskMessages),
  ];

  if (warnings.length > 0) {
    lines.push("", "Warnings", ...warnings.map((warning) => `  - ${warning}`));
  }

  return { ok: true, text: lines.join("\n") };
}

function dryRunPlaceholderTranscript(request: SessionRunConfig): string {
  const player = request.cast.players[0]?.name ?? "Player";
  return [
    `[0:01] ${request.cast.dm.name} (DM): This placeholder line stands in for the named transcript during a dry run.`,
    `[0:06] ${player}: No recording was sent anywhere.`,
  ].join("\n");
}

function renderMessages(messages: ChatCompletionMessageParam[]): string {
  return messages
    .map((message) => {
      const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
      return `${message.role.toUpperCase()}\n${content}`;
    })
    .join("\n\n");
}
