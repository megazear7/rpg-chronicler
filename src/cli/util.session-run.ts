import { promises as fs } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { getSessionPreset } from "../shared/util.session-presets.js";
import { SessionRunConfig } from "../shared/type.session.js";
import {
  describeChunk,
  planSessionChunks,
  renderSessionMarkdown,
  resolveOpenAiApiKey,
  scrubSecret,
  SessionCliError,
  taskWritesNamedTranscriptDirectly,
} from "../shared/util.session.js";
import { assertFfmpegAvailable } from "./util.session-audio.js";
import { collectAudioFacts } from "./util.session-files.js";
import { planSessionOutput } from "./util.session-output.js";
import { buildDryRunReport } from "./util.session-report.js";
import { transcribeChunk } from "./util.session-realtime.js";
import { runTextTask } from "./util.session-text.js";

export function loadSessionEnv(envFile: string): void {
  loadDotenv({ path: envFile, quiet: true });
}

export async function runSessionCli(request: SessionRunConfig): Promise<void> {
  const facts = await collectAudioFacts(request.audioPaths);
  let outputIsDirectory = false;
  if (request.output && request.output !== "-") {
    try {
      const stat = await fs.stat(request.output);
      outputIsDirectory = stat.isDirectory();
    } catch {
      outputIsDirectory = false;
    }
  }

  if (request.dryRun) {
    const report = await buildDryRunReport({
      request,
      files: facts,
      apiKey: resolveOpenAiApiKey(process.env) ? "set" : "missing",
      outputIsDirectory,
    });
    console.log(report.text);
    return;
  }

  const apiKey = resolveOpenAiApiKey(process.env);
  if (!apiKey) {
    throw new SessionCliError(
      "No OpenAI API key found. Set OPENAI_API_KEY in the environment or in .env, then rerun the same command.",
    );
  }
  await assertFfmpegAvailable();

  const log = (message: string): void => {
    console.error(message);
  };
  log(`Audio model: ${request.audioModel} (Realtime WebSocket)`);
  log(`Text model: ${request.textModel}`);

  const sections: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let previousTranscript = "";

  for (const file of facts) {
    if (file.probeError) {
      log(
        `${file.path}: duration could not be read (${file.probeError}). Sending it as one Realtime session. Install ffprobe to split long recordings with --chunk-minutes.`,
      );
    }
    const chunks = planSessionChunks(file.durationSeconds, request.chunkMinutes);
    for (const chunk of chunks) {
      const result = await transcribeChunk({
        apiKey,
        baseUrl: request.baseUrl,
        model: request.audioModel,
        reasoningEffort: request.audioReasoningEffort,
        filePath: file.path,
        chunk,
        chunkCount: chunks.length,
        cast: request.cast,
        presetId: request.presetId,
        instructions: request.instructions,
        previousTranscript,
        log,
      });
      inputTokens += result.inputTokens;
      outputTokens += result.outputTokens;
      const header = `## ${path.basename(file.path)} ${describeChunk(chunk, chunks.length)}`;
      const section = `${header}\n${result.transcript.trim()}`;
      sections.push(section);
      previousTranscript = `${previousTranscript}\n${section}`.trim();
    }
  }

  const namedTranscript = sections.join("\n\n").trim();
  if (!namedTranscript) {
    throw new SessionCliError("The audio step did not produce a transcript.");
  }

  const direct = taskWritesNamedTranscriptDirectly(request.presetId, request.instructions);
  let body = namedTranscript;
  if (!direct) {
    log(`Writing the ${request.presetId ?? "custom"} result with ${request.textModel}.`);
    const written = await runTextTask({
      apiKey,
      baseUrl: request.baseUrl,
      model: request.textModel,
      reasoningEffort: request.reasoningEffort,
      cast: request.cast,
      presetId: request.presetId,
      instructions: request.instructions,
      transcript: namedTranscript,
      log,
    });
    body = written.text;
    inputTokens += written.inputTokens;
    outputTokens += written.outputTokens;
  }

  const title = request.presetId ? getSessionPreset(request.presetId).title : "Custom session notes";
  const document = renderSessionMarkdown({
    title,
    sourcePaths: request.audioPaths,
    cast: request.cast,
    presetId: request.presetId,
    instructions: request.instructions,
    audioModel: request.audioModel,
    textModel: request.textModel,
    body,
  });
  const withUsage = `${document.trim()}\n\nTokens recorded from the API: input ${inputTokens}, output ${outputTokens}.\n`;
  await writeSessionOutput(request, outputIsDirectory, namedTranscript, withUsage);
  log(
    `Done. Audio model ${request.audioModel} heard the recording. Input tokens ${inputTokens}, output tokens ${outputTokens}.`,
  );
}

async function writeSessionOutput(
  request: SessionRunConfig,
  outputIsDirectory: boolean,
  namedTranscript: string,
  document: string,
): Promise<void> {
  const plan = planSessionOutput({
    output: request.output,
    presetId: request.presetId,
    instructions: request.instructions,
    outputIsDirectory,
  });
  if (plan.kind === "stdout") {
    console.log(document);
    return;
  }
  if (plan.kind === "file") {
    if (!plan.resultPath) {
      throw new SessionCliError("No output path was set.");
    }
    await fs.mkdir(path.dirname(plan.resultPath), { recursive: true });
    await fs.writeFile(plan.resultPath, document, "utf8");
    console.error(`Wrote ${plan.resultPath}`);
    return;
  }
  await fs.mkdir(plan.directory ?? ".", { recursive: true });
  if (plan.transcriptPath && plan.resultPath) {
    await fs.writeFile(plan.transcriptPath, `${namedTranscript}\n`, "utf8");
    await fs.writeFile(plan.resultPath, document, "utf8");
    console.error(`Wrote ${plan.transcriptPath}`);
    console.error(`Wrote ${plan.resultPath}`);
    return;
  }
  if (plan.transcriptPath) {
    await fs.writeFile(plan.transcriptPath, document, "utf8");
    console.error(`Wrote ${plan.transcriptPath}`);
  }
}

export function publicError(error: unknown, secret: string | undefined): string {
  const message = error instanceof Error ? error.message : String(error);
  return scrubSecret(message, secret);
}
