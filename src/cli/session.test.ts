import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { parseSessionArgv } from "./command.session.js";
import { CLI_VERSION } from "./version.js";
import { buildDryRunReport } from "./util.session-report.js";
import { planSessionOutput } from "./util.session-output.js";
import { collectAudioFacts } from "./util.session-files.js";
import { sessionPrompt } from "../shared/prompt.session.js";
import { sessionSpeakerPrompt } from "../shared/prompt.session-speakers.js";
import { SessionPresetId } from "../shared/type.session.js";
import { sessionPresets } from "../shared/util.session-presets.js";
import {
  DEFAULT_AUDIO_MODEL,
  DEFAULT_TEXT_MODEL,
  planSessionChunks,
  realtimeWebSocketUrl,
  resolveOpenAiApiKey,
  scrubSecret,
  splitTranscript,
} from "../shared/util.session.js";

const baseArgs = ["session.mp3", "--dm", "Alex", "--player-1", "Sam", "--preset", "transcript"];

test("the default audio model is GPT Realtime 2.1", () => {
  assert.equal(DEFAULT_AUDIO_MODEL, "gpt-realtime-2.1");
  assert.equal(DEFAULT_TEXT_MODEL, "gpt-6.2-sol");
});

test("parses players, aliases, preset, and the realtime model default", async () => {
  const result = await parseSessionArgv([
    "part1.mp3",
    "part2.m4a",
    "--dm",
    "Alex",
    "--dm-alias",
    "GM, Narrator",
    "--player-1",
    "Sam",
    "--player-1-alias",
    "Elara,the wizard",
    "--player-2",
    "Jordan",
    "--player-2-alias",
    "Thorin",
    "--preset",
    "SUMMARY",
    "--instructions",
    "Keep the jokes.",
    "--output",
    "out",
    "--dry-run",
    "--chunk-minutes",
    "15",
  ]);
  assert.equal(result.type, "run");
  if (result.type !== "run") {
    return;
  }
  assert.deepEqual(result.request.audioPaths, ["part1.mp3", "part2.m4a"]);
  assert.equal(result.request.cast.dm.name, "Alex");
  assert.deepEqual(result.request.cast.dm.aliases, ["GM", "Narrator"]);
  assert.equal(result.request.cast.players[1]?.name, "Jordan");
  assert.deepEqual(result.request.cast.players[0]?.aliases, ["Elara", "the wizard"]);
  assert.equal(result.request.presetId, "summary");
  assert.equal(result.request.instructions, "Keep the jokes.");
  assert.equal(result.request.audioModel, "gpt-realtime-2.1");
  assert.equal(result.request.textModel, "gpt-6.2-sol");
  assert.equal(result.request.dryRun, true);
  assert.equal(result.request.chunkMinutes, 15);
  assert.equal(result.request.output, "out");
});

test("a flag overrides the env model and the env overrides the default", async () => {
  const fromEnv = await parseSessionArgv(baseArgs, { OPENAI_AUDIO_MODEL: "gpt-realtime-2" });
  assert.equal(fromEnv.type, "run");
  if (fromEnv.type === "run") {
    assert.equal(fromEnv.request.audioModel, "gpt-realtime-2");
  }
  const fromFlag = await parseSessionArgv([...baseArgs, "--audio-model", "gpt-realtime-2.1-mini"], {
    OPENAI_AUDIO_MODEL: "gpt-realtime-2",
  });
  assert.equal(fromFlag.type, "run");
  if (fromFlag.type === "run") {
    assert.equal(fromFlag.request.audioModel, "gpt-realtime-2.1-mini");
  }
});

test("the API key is read only from OPENAI_API_KEY", () => {
  assert.equal(resolveOpenAiApiKey({ OPENAI_MODEL_API_KEY: "sk-web-app-key" }), undefined);
  assert.equal(resolveOpenAiApiKey({ OPENAI_API_KEY: "  " }), undefined);
  assert.equal(resolveOpenAiApiKey({ OPENAI_API_KEY: "sk-live-key", OPENAI_MODEL_API_KEY: "sk-other" }), "sk-live-key");
  assert.equal(scrubSecret("failed with sk-live-key in the body", "sk-live-key"), "failed with [redacted] in the body");
});

test("validation errors explain the missing piece", async () => {
  const missingFile = await parseSessionArgv(["--dm", "Alex", "--player-1", "Sam", "--preset", "transcript"]);
  assert.equal(missingFile.type, "error");
  if (missingFile.type === "error") {
    assert.match(missingFile.message, /audio file/i);
  }

  const missingDm = await parseSessionArgv(["session.mp3", "--player-1", "Sam", "--preset", "transcript"]);
  assert.equal(missingDm.type, "error");
  if (missingDm.type === "error") {
    assert.match(missingDm.message, /--dm/);
  }

  const lastName = await parseSessionArgv([
    "session.mp3",
    "--dm",
    "Alex Lockhart",
    "--player-1",
    "Sam",
    "--preset",
    "transcript",
  ]);
  assert.equal(lastName.type, "error");
  if (lastName.type === "error") {
    assert.match(lastName.message, /last name/);
  }

  const gap = await parseSessionArgv([
    "session.mp3",
    "--dm",
    "Alex",
    "--player-1",
    "Sam",
    "--player-3",
    "Jordan",
    "--preset",
    "transcript",
  ]);
  assert.equal(gap.type, "error");
  if (gap.type === "error") {
    assert.match(gap.message, /--player-2/);
  }

  const aliasOnly = await parseSessionArgv([
    "session.mp3",
    "--dm",
    "Alex",
    "--player-1-alias",
    "Elara",
    "--preset",
    "transcript",
  ]);
  assert.equal(aliasOnly.type, "error");
  if (aliasOnly.type === "error") {
    assert.match(aliasOnly.message, /--player-1/);
  }

  const noTask = await parseSessionArgv(["session.mp3", "--dm", "Alex", "--player-1", "Sam"]);
  assert.equal(noTask.type, "error");
  if (noTask.type === "error") {
    assert.match(noTask.message, /--preset or --instructions/);
  }

  const unknown = await parseSessionArgv(["session.mp3", "--dm", "Alex", "--player-1", "Sam", "--preset", "opera"]);
  assert.equal(unknown.type, "error");
  if (unknown.type === "error") {
    assert.match(unknown.message, /comic/);
  }

  const duplicate = await parseSessionArgv([
    "session.mp3",
    "--dm",
    "Alex",
    "--player-1",
    "Sam",
    "--player-1",
    "Jordan",
    "--preset",
    "transcript",
  ]);
  assert.equal(duplicate.type, "error");
  if (duplicate.type === "error") {
    assert.match(duplicate.message, /--player-1 was provided/);
  }

  const zero = await parseSessionArgv(["session.mp3", "--dm", "Alex", "--player-0", "Sam", "--preset", "transcript"]);
  assert.equal(zero.type, "error");
  if (zero.type === "error") {
    assert.match(zero.message, /start at 1/);
  }
});

test("help and preset listing describe the command", async () => {
  const help = await parseSessionArgv(["--help"]);
  assert.equal(help.type, "help");
  if (help.type === "help") {
    for (const flag of [
      "--dm",
      "--dm-alias",
      "--player-1",
      "--player-1-alias",
      "--instructions",
      "--preset",
      "--list-presets",
      "--output",
      "--dry-run",
      "--audio-model",
      "--text-model",
      "--chunk-minutes",
      "--version",
      "gpt-realtime-2.1",
    ]) {
      assert.match(help.text, new RegExp(flag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(help.text, /preset selects the task/i);
  }

  const version = await parseSessionArgv(["--version"]);
  assert.equal(version.type, "version");
  if (version.type === "version") {
    assert.match(version.text, new RegExp(CLI_VERSION));
  }

  const listed = await parseSessionArgv(["--list-presets"]);
  assert.equal(listed.type, "list-presets");
  if (listed.type === "list-presets") {
    for (const id of SessionPresetId.options) {
      assert.match(listed.text, new RegExp(id));
      assert.match(listed.text, new RegExp(sessionPresets[id].summary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }
});

test("prompts keep the cast, the preset, and extra instructions together", async () => {
  const cast = {
    dm: { name: "Alex", aliases: ["GM"] },
    players: [{ name: "Sam", aliases: ["Elara"] }],
  };
  const speaker = await sessionSpeakerPrompt({ cast, chunkLabel: "chunk 1 of 2, 0:00 to 10:00" });
  const speakerText = speaker.map((message) => message.content).join("\n");
  assert.match(speakerText, /Alex/);
  assert.match(speakerText, /Elara/);
  assert.match(speakerText, /streamed on the Realtime connection/);
  assert.match(speakerText, /not a new instruction/);

  const both = await sessionPrompt({
    mode: "produce",
    cast,
    presetId: "comic",
    instructions: "Keep it to 8 pages.",
    transcript: "[0:01] Alex (DM): Roll initiative.",
  });
  const bothText = both.map((message) => message.content).join("\n");
  assert.match(bothText, /Knights of the Dinner Table/);
  assert.match(bothText, /Keep it to 8 pages/);
  assert.match(bothText, /Additional instructions/);

  const presetOnly = await sessionPrompt({
    mode: "produce",
    cast,
    presetId: "dm-notes",
    transcript: "[0:01] Alex (DM): The door opens.",
  });
  const presetText = presetOnly.map((message) => message.content).join("\n");
  assert.match(presetText, /prepare the next session/);
  assert.doesNotMatch(presetText, /Additional instructions/);

  const instructionsOnly = await sessionPrompt({
    mode: "produce",
    cast,
    instructions: "List only the loot.",
    transcript: "[0:01] Sam: I take the sword.",
  });
  const instructionsText = instructionsOnly.map((message) => message.content).join("\n");
  assert.match(instructionsText, /List only the loot/);
  assert.doesNotMatch(instructionsText, /PAGE 1/);
});

test("chunk planning and the dry-run report stay offline", async () => {
  assert.equal(planSessionChunks(30, 10).length, 1);
  const longChunks = planSessionChunks(60 * 25, 10);
  assert.equal(longChunks.length, 3);
  assert.equal(longChunks[2]?.startSeconds, 1200);
  assert.equal(planSessionChunks(null, 10)[0]?.durationSeconds, null);
  assert.equal(splitTranscript("a\nb\nc", 3).length > 1, true);

  const requestResult = await parseSessionArgv([...baseArgs, "--dry-run", "--instructions", "Mention the snack pile."]);
  assert.equal(requestResult.type, "run");
  if (requestResult.type !== "run") {
    return;
  }
  const report = await buildDryRunReport({
    request: requestResult.request,
    files: [{ path: "session.mp3", sizeBytes: 2048, durationSeconds: 90, probeError: null }],
    apiKey: "missing",
    outputIsDirectory: false,
  });
  assert.equal(report.ok, true);
  assert.match(report.text, /gpt-realtime-2\.1/);
  assert.match(report.text, /wss:\/\/api\.openai\.com\/v1\/realtime\?model=gpt-realtime-2\.1/);
  assert.match(report.text, /No audio was uploaded/);
  assert.match(report.text, /Mention the snack pile/);
  assert.doesNotMatch(report.text, /sk-/);
  assert.equal(
    realtimeWebSocketUrl("https://api.openai.com/v1", DEFAULT_AUDIO_MODEL),
    "https://api.openai.com/v1/realtime?model=gpt-realtime-2.1".replace("https://", "wss://"),
  );
});

test("output paths follow the preset", () => {
  const directory = planSessionOutput({
    output: undefined,
    presetId: "summary",
    instructions: undefined,
    outputIsDirectory: false,
  });
  assert.equal(directory.kind, "directory");
  assert.match(directory.transcriptPath ?? "", /named-transcript\.md$/);
  assert.match(directory.resultPath ?? "", /summary\.md$/);

  const transcriptOnly = planSessionOutput({
    output: "notes/",
    presetId: "transcript",
    instructions: undefined,
    outputIsDirectory: false,
  });
  assert.equal(transcriptOnly.resultPath, undefined);
  assert.match(transcriptOnly.transcriptPath ?? "", /transcript\.md$/);
  assert.equal(
    planSessionOutput({ output: "-", presetId: "story", instructions: undefined, outputIsDirectory: false }).kind,
    "stdout",
  );
});

test("audio paths are checked without a network call", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "session-cli-"));
  try {
    const audioPath = path.join(directory, "table.mp3");
    await writeFile(audioPath, Buffer.from([0, 1, 2, 3]));
    const facts = await collectAudioFacts([audioPath]);
    assert.equal(facts[0]?.sizeBytes, 4);
    await assert.rejects(() => collectAudioFacts([path.join(directory, "missing.mp3")]), /not found/);
    const emptyPath = path.join(directory, "empty.wav");
    await writeFile(emptyPath, Buffer.alloc(0));
    await assert.rejects(() => collectAudioFacts([emptyPath]), /empty/);
    const textPath = path.join(directory, "notes.txt");
    await writeFile(textPath, "hello");
    await assert.rejects(() => collectAudioFacts([textPath]), /not a supported recording/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the env file stays gitignored and the example has no key", async () => {
  const gitignore = await readFile(".gitignore", "utf8");
  assert.match(gitignore, /^\.env$/m);
  const example = await readFile(".env.example", "utf8");
  assert.match(example, /^OPENAI_API_KEY=$/m);
  assert.doesNotMatch(example, /sk-[A-Za-z0-9]/);
  const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { version: string };
  assert.equal(packageJson.version, CLI_VERSION);
});
