# RPG Chronicler

## Setup

```sh
nvm use 22
npm install
npm run init
npm start
```

Open [localhost:3000](http://localhost:3000/)

## Develop

Hot reloading is in place on all files.
Review the prompt instructions under `.github/prompts` for coding guidelines.

```
npm start
```

## Lint & Fix

```
npm run fix
```

## Session CLI

The `session` command reads one or more tabletop RPG recordings, streams them to OpenAI, and writes a transcript plus the task you asked for. It does not use the web app's job database. Install ffmpeg so recordings can be converted to 24 kHz mono PCM.

```sh
nvm use 22
npm install
```

Put the API key in the environment or in `.env`. The file is gitignored. The command reads `OPENAI_API_KEY` only. The web app's `OPENAI_MODEL_API_KEY` is a different variable and is not used here.

```sh
OPENAI_API_KEY=sk-...
```

Or, in `.env`:

```sh
OPENAI_API_KEY=sk-...
```

### Live run

This is the end-to-end command once `OPENAI_API_KEY` is set and `recording.mp3` is a real session file:

```sh
npm run session -- recording.mp3 --dm Alex --player-1 Sam --player-1-alias Elara --preset transcript
```

`npm run session` builds the CLI and runs it. Add more files in playback order, and add `--player-2`, `--player-3`, and so on for the rest of the table. The audio step prints `Audio model: gpt-realtime-2.1 (Realtime WebSocket)` and writes `session-output/transcript.md`.

A dry run checks the arguments and prints the prompts without opening a socket:

```sh
npm run session -- recording.mp3 --dm Alex --player-1 Sam --preset transcript --dry-run
```

### What the audio step does

GPT Realtime 2.1 (`gpt-realtime-2.1`) is only available on the Realtime API. The CLI opens `wss://api.openai.com/v1/realtime?model=gpt-realtime-2.1`, converts each recording with ffmpeg, and streams 24 kHz PCM16 with `input_audio_buffer.append`. Turn detection is off. After the clip is committed, the model answers in text with a speaker-attributed transcript. Names and aliases in the prompt tell it who the DM and players are, including character names and NPC voices.

Recordings longer than `--chunk-minutes` (default 10) are split into separate Realtime sessions so one response can hold the transcript. The model id is set in `src/shared/util.session.ts` as `DEFAULT_AUDIO_MODEL`. Override it with `--audio-model` or `OPENAI_AUDIO_MODEL`.

The preset or `--instructions` step runs afterward on the named transcript, using `gpt-6.2-sol` (`DEFAULT_TEXT_MODEL` in the same file, override with `--text-model` or `OPENAI_TEXT_MODEL`). That model is not a stand-in for the audio step. `gpt-realtime-2.1` does not support chat completions, and the writing step no longer needs the audio. If the preset is `transcript` and you do not pass `--instructions`, the Realtime transcript is the result and the text model is not called.

### Instructions and presets

Pass `--preset`, `--instructions`, or both. One of them is required. A preset selects the task. `--instructions` can be the whole task, or extra guidance on top of a preset. When both are set and they conflict, the extra instructions win as long as the preset's format still holds.

| Preset | What it writes |
| --- | --- |
| `transcript` | Speaker-attributed transcript, with character and NPC voices marked. |
| `play-by-play` | What the people at the table did, in player names. |
| `summary` | A few campaign-log paragraphs. |
| `dm-notes` | What the DM needs next session. |
| `story` | In-world prose, without table talk. |
| `comic` | A Knights of the Dinner Table style comic script about this group. |

Add a preset by extending `SessionPresetId` in `src/shared/type.session.ts` and adding a matching entry in `src/shared/util.session-presets.ts`.

```sh
npm run session -- --list-presets
```

### Flags

| Flag | Meaning |
| --- | --- |
| audio paths | One or more recordings, in playback order. |
| `--dm <name>` | DM first name or table name. No spaces and no last name. |
| `--dm-alias <a,b,c>` | Other names for the DM, or NPC voices the DM performs. |
| `--player-N <name>` | Player N. Start at 1 and do not skip numbers. |
| `--player-N-alias <a,b,c>` | Aliases for that player, usually character names. |
| `--instructions <text>` | Free-text task or extra guidance. |
| `--preset <name>` | One of the presets above. |
| `--list-presets` | Print the presets and exit. |
| `-o, --output <path>` | File, directory, or `-` for stdout. Default: `session-output/`. |
| `--dry-run` | Print the plan and prompts. No network call. |
| `-h, --help` | Usage and examples. |
| `-V, --version` | CLI version. |
| `--audio-model <id>` | Realtime model. Default: `gpt-realtime-2.1`. |
| `--audio-reasoning-effort <level>` | `minimal`, `low`, `medium`, `high`, `xhigh`, or `off`. Default: `low`. |
| `--text-model <id>` | Text model. Default: `gpt-6.2-sol`. |
| `--reasoning-effort <level>` | `low`, `medium`, `high`, `xhigh`, `max`, or `off`. Default: `medium`. |
| `--chunk-minutes <minutes>` | Realtime clip length. `0` sends the whole file. Default: `10`. |
| `--base-url <url>` | API base URL. Default: `https://api.openai.com/v1`. |
| `--env-file <path>` | Env file. Default: `.env`. |

A directory receives `named-transcript.md` and a file named for the preset. A transcript preset with no extra instructions writes `transcript.md` only. A file path receives the final document.

### First live test

1. Install ffmpeg and confirm `ffmpeg -version` works.
2. Set `OPENAI_API_KEY` in the environment or `.env`. Do not commit that file.
3. Use a short recording for the first run. Realtime audio is billed as audio input tokens.
4. Run:

```sh
npm run session -- recording.mp3 --dm Alex --player-1 Sam --player-1-alias Elara --preset transcript
```

5. Expect `Audio model: gpt-realtime-2.1 (Realtime WebSocket)` on stderr and `session-output/transcript.md` when it finishes.

`npm test` checks argument parsing, validation, preset listing, and prompt assembly without a key or a network call.
