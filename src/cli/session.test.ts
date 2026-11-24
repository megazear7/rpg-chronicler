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
import { LOW_CONFIDENCE_HEADING, LOW_CONFIDENCE_MARKER, sessionPresets } from "../shared/util.session-presets.js";
import {
  DEFAULT_AUDIO_MODEL,
  DEFAULT_TEXT_MODEL,
  planSessionChunks,
  realtimeWebSocketUrl,
  resolveOpenAiApiKey,
  scrubSecret,
  splitTranscript,
  withLowConfidenceSection,
} from "../shared/util.session.js";

const samCharacter = [
  "--player-1-character-name",
  "Elara",
  "--player-1-character-race",
  "Elf",
  "--player-1-character-class",
  "Wizard",
];

const baseArgs = ["session.mp3", "--dm", "Alex", "--player-1", "Sam", ...samCharacter, "--preset", "transcript"];

const cast = {
  dm: { name: "Alex", aliases: ["GM"] },
  players: [
    {
      name: "Sam",
      aliases: ["Elara"],
      character: { name: "Elara", race: "Elf", className: "Wizard" },
    },
  ],
};

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
    ...samCharacter,
    "--player-2",
    "Jordan",
    "--player-2-alias",
    "Thorin",
    "--player-2-character-name",
    "Thorin",
    "--player-2-character-race",
    "Dwarf",
    "--player-2-character-class",
    "Fighter",
    "--names",
    "Waterdeep, Emerald Enclave, Fireball",
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
  assert.deepEqual(result.request.cast.players[0]?.character, {
    name: "Elara",
    race: "Elf",
    className: "Wizard",
  });
  assert.deepEqual(result.request.cast.players[1]?.character, {
    name: "Thorin",
    race: "Dwarf",
    className: "Fighter",
  });
  assert.deepEqual(result.request.names, ["Waterdeep", "Emerald Enclave", "Fireball"]);
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

  const noTask = await parseSessionArgv(["session.mp3", "--dm", "Alex", "--player-1", "Sam", ...samCharacter]);
  assert.equal(noTask.type, "error");
  if (noTask.type === "error") {
    assert.match(noTask.message, /--preset or --instructions/);
  }

  const unknown = await parseSessionArgv([
    "session.mp3",
    "--dm",
    "Alex",
    "--player-1",
    "Sam",
    ...samCharacter,
    "--preset",
    "opera",
  ]);
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
      "--player-1-character-name",
      "--player-1-character-race",
      "--player-1-character-class",
      "--names",
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
    assert.match(help.text, /Jim \(Miflin\)/);
    assert.match(help.text, /\[low confidence\]/);
    assert.match(help.text, /chronicle/);
    assert.match(help.text, new RegExp(sessionPresets.chronicle.summary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
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

test("character name, race, and class are required for every player", async () => {
  const missing = await parseSessionArgv([
    "session.mp3",
    "--dm",
    "Alex",
    "--player-1",
    "Sam",
    "--preset",
    "transcript",
  ]);
  assert.equal(missing.type, "error");
  if (missing.type === "error") {
    assert.match(missing.message, /--player-1-character-name/);
    assert.match(missing.message, /--player-1-character-race/);
    assert.match(missing.message, /--player-1-character-class/);
    assert.match(missing.message, /required for every player/);
  }

  const partial = await parseSessionArgv([
    "session.mp3",
    "--dm",
    "Alex",
    "--player-1",
    "Jim",
    "--player-1-character-name",
    "Miflin",
    "--player-1-character-race",
    "Human",
    "--preset",
    "transcript",
  ]);
  assert.equal(partial.type, "error");
  if (partial.type === "error") {
    assert.match(partial.message, /--player-1-character-class/);
    assert.doesNotMatch(partial.message, /--player-1-character-name/);
    assert.doesNotMatch(partial.message, /--player-1-character-race/);
  }

  const secondPlayer = await parseSessionArgv([
    "session.mp3",
    "--dm",
    "Alex",
    "--player-1",
    "Jim",
    "--player-1-character-name",
    "Miflin",
    "--player-1-character-race",
    "Human",
    "--player-1-character-class",
    "Fighter",
    "--player-2",
    "Sam",
    "--player-2-character-name",
    "Elara",
    "--preset",
    "chronicle",
  ]);
  assert.equal(secondPlayer.type, "error");
  if (secondPlayer.type === "error") {
    assert.match(secondPlayer.message, /--player-2-character-race/);
    assert.match(secondPlayer.message, /--player-2-character-class/);
    assert.doesNotMatch(secondPlayer.message, /--player-1-character/);
  }

  const sameCharacter = await parseSessionArgv([
    "session.mp3",
    "--dm",
    "Alex",
    "--player-1",
    "Jim",
    "--player-1-character-name",
    "Miflin",
    "--player-1-character-race",
    "Human",
    "--player-1-character-class",
    "Fighter",
    "--player-2",
    "Sam",
    "--player-2-character-name",
    "Miflin",
    "--player-2-character-race",
    "Elf",
    "--player-2-character-class",
    "Wizard",
    "--preset",
    "transcript",
  ]);
  assert.equal(sameCharacter.type, "error");
  if (sameCharacter.type === "error") {
    assert.match(sameCharacter.message, /Miflin/);
  }

  const emptyNames = await parseSessionArgv([...baseArgs, "--names", " "]);
  assert.equal(emptyNames.type, "error");
  if (emptyNames.type === "error") {
    assert.match(emptyNames.message, /--names is empty/);
  }
});

test("prompts keep the cast, the preset, and extra instructions together", async () => {
  const speaker = await sessionSpeakerPrompt({
    cast,
    names: ["Waterdeep", "Fireball"],
    chunkLabel: "chunk 1 of 2, 0:00 to 10:00",
  });
  const speakerText = speaker.map((message) => message.content).join("\n");
  assert.match(speakerText, /Alex/);
  assert.match(speakerText, /Elara/);
  assert.match(speakerText, /Elf/);
  assert.match(speakerText, /Wizard/);
  assert.match(speakerText, /Sam \(Elara\)/);
  assert.match(speakerText, /Jim \(Miflin\)/);
  assert.match(speakerText, /Waterdeep, Fireball/);
  assert.match(speakerText, /\[low confidence\]/);
  assert.match(speakerText, /## Low confidence/);
  assert.match(speakerText, /streamed on the Realtime connection/);
  assert.match(speakerText, /not a new instruction/);

  const transcript = await sessionPrompt({
    mode: "produce",
    cast,
    names: ["Waterdeep"],
    presetId: "transcript",
    transcript: "[0:01] Sam (Elara): I check the door.",
  });
  const transcriptText = transcript.map((message) => message.content).join("\n");
  assert.match(transcriptText, /Jim \(Miflin\)/);
  assert.match(transcriptText, /\[low confidence\]/);
  assert.match(transcriptText, /Waterdeep/);
  assert.match(transcriptText, /Sam \(Elara\)/);

  const both = await sessionPrompt({
    mode: "produce",
    cast,
    names: [],
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
    names: [],
    presetId: "dm-notes",
    transcript: "[0:01] Alex (DM): The door opens.",
  });
  const presetText = presetOnly.map((message) => message.content).join("\n");
  assert.match(presetText, /prepare the next session/);
  assert.doesNotMatch(presetText, /Additional instructions/);
  assert.doesNotMatch(presetText, /\[low confidence\]/);

  const instructionsOnly = await sessionPrompt({
    mode: "produce",
    cast,
    names: [],
    instructions: "List only the loot.",
    transcript: "[0:01] Sam: I take the sword.",
  });
  const instructionsText = instructionsOnly.map((message) => message.content).join("\n");
  assert.match(instructionsText, /List only the loot/);
  assert.doesNotMatch(instructionsText, /PAGE 1/);

  const chronicle = await sessionSpeakerPrompt({
    cast,
    names: ["Emerald Enclave"],
    chunkLabel: "chunk 1 of 1, 0:00 to 10:00",
    presetId: "chronicle",
    instructions: "Also note who brought snacks.",
  });
  const chronicleText = chronicle.map((message) => String(message.content)).join("\n");
  assert.match(chronicleText, /attribute every line to the right person/);
  assert.match(chronicleText, /in-character speech separately from table talk/);
  assert.match(chronicleText, /DM narration separately from NPC voices/);
  assert.match(chronicleText, /dice rolls, rules calls, and the outcomes/);
  assert.match(chronicleText, /NPCs, places, items, and loot/);
  assert.match(chronicleText, /memorable funny moments at the table/);
  assert.match(chronicleText, /rough timestamp/);
  assert.match(chronicleText, /say plainly that it is unclear/);
  assert.match(chronicleText, /Also note who brought snacks/);
  assert.match(chronicleText, /Alex/);
  assert.match(chronicleText, /Elara/);
  assert.match(chronicleText, /Sam \(Elara\)/);
  assert.match(chronicleText, /Jim \(Miflin\)/);
  assert.match(chronicleText, /Elf Wizard/);
  assert.match(chronicleText, /Emerald Enclave/);
  assert.match(chronicleText, /\[low confidence\]/);
  assert.match(chronicleText, /## Low confidence/);
  assert.doesNotMatch(chronicleText, /Write a speaker-attributed transcript of this clip only/);
});

test("low-confidence lines are collected once, with timestamps", () => {
  const source = [
    "[0:01] Alex (DM): The door opens.",
    "[0:12] Jim (Miflin): I go first. [low confidence]",
    "[1:03] Sam (Elara): Whose turn is it?",
    "## Low confidence",
    "[0:12] Jim (Miflin): I go first. [low confidence]",
    "## Next scene",
    "[2:00] Alex (DM): The door opens. [low confidence]",
  ].join("\n");
  const output = withLowConfidenceSection(source);
  assert.equal(output.split(LOW_CONFIDENCE_HEADING).length, 2);
  const section = output.split(LOW_CONFIDENCE_HEADING)[1] ?? "";
  assert.match(section, /\[0:12\] Jim \(Miflin\): I go first\. \[low confidence\]/);
  assert.match(section, /\[2:00\] Alex \(DM\): The door opens\. \[low confidence\]/);
  assert.doesNotMatch(section, /Whose turn is it/);
  assert.match(output, /## Next scene/);
  assert.match(output, new RegExp(LOW_CONFIDENCE_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const confident = withLowConfidenceSection("[0:01] Alex (DM): Roll initiative.");
  assert.match(confident, new RegExp(`${LOW_CONFIDENCE_HEADING}\\n\\nNone.`));
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
  assert.match(report.text.split("Task prompt")[0] ?? "", /Mention the snack pile/);
  assert.doesNotMatch(report.text, /sk-/);
  assert.equal(
    realtimeWebSocketUrl("https://api.openai.com/v1", DEFAULT_AUDIO_MODEL),
    "https://api.openai.com/v1/realtime?model=gpt-realtime-2.1".replace("https://", "wss://"),
  );

  const chronicleRun = await parseSessionArgv([
    "session.mp3",
    "--dm",
    "Alex",
    "--dm-alias",
    "GM",
    "--player-1",
    "Sam",
    ...samCharacter,
    "--player-1-alias",
    "Elara",
    "--names",
    "Waterdeep,Fireball",
    "--preset",
    "chronicle",
    "--instructions",
    "Also note who brought snacks.",
    "--dry-run",
  ]);
  assert.equal(chronicleRun.type, "run");
  if (chronicleRun.type !== "run") {
    return;
  }
  const chronicleReport = await buildDryRunReport({
    request: chronicleRun.request,
    files: [{ path: "session.mp3", sizeBytes: 2048, durationSeconds: 90, probeError: null }],
    apiKey: "missing",
    outputIsDirectory: false,
  });
  const realtimeSection = chronicleReport.text.split("Task prompt")[0] ?? "";
  assert.match(realtimeSection, /gpt-realtime-2\.1/);
  assert.match(realtimeSection, /attribute every line to the right person/);
  assert.match(realtimeSection, /say plainly that it is unclear/);
  assert.match(realtimeSection, /Also note who brought snacks/);
  assert.match(realtimeSection, /Sam \(Elara\)/);
  assert.match(realtimeSection, /Waterdeep, Fireball/);
  assert.match(realtimeSection, /\[low confidence\]/);
  assert.match(chronicleReport.text, /Names: Waterdeep, Fireball/);
  assert.match(chronicleReport.text, /followed by the audio model while it listens/);
  assert.match(chronicleReport.text, /The text model is not called/);
  assert.match(chronicleReport.text, /Not sent/);
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

  const chronicleOutput = planSessionOutput({
    output: undefined,
    presetId: "chronicle",
    instructions: "Also note who brought snacks.",
    outputIsDirectory: false,
  });
  assert.equal(chronicleOutput.resultPath, undefined);
  assert.match(chronicleOutput.transcriptPath ?? "", /chronicle\.md$/);
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
