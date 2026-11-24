import { promises as fs } from "node:fs";
import path from "node:path";
import { isSessionAudioExtension, SessionCliError, SESSION_AUDIO_EXTENSIONS } from "../shared/util.session.js";
import { probeAudioDuration } from "./util.session-audio.js";

export interface AudioFileFact {
  path: string;
  sizeBytes: number;
  durationSeconds: number | null;
  probeError: string | null;
}

export async function collectAudioFacts(audioPaths: string[]): Promise<AudioFileFact[]> {
  const facts: AudioFileFact[] = [];
  const seen = new Set<string>();
  for (const audioPath of audioPaths) {
    const resolved = path.resolve(audioPath);
    if (seen.has(resolved)) {
      throw new SessionCliError(`An audio path was given more than once: ${audioPath}`);
    }
    seen.add(resolved);

    let stat;
    try {
      stat = await fs.stat(audioPath);
    } catch {
      throw new SessionCliError(`Audio file not found: ${audioPath}`);
    }
    if (stat.isDirectory()) {
      throw new SessionCliError(`${audioPath} is a directory. Pass the recording file itself.`);
    }
    if (stat.size === 0) {
      throw new SessionCliError(`${audioPath} is empty.`);
    }
    const extension = path.extname(audioPath);
    if (!isSessionAudioExtension(extension)) {
      throw new SessionCliError(
        `${audioPath} is not a supported recording. Use one of: ${SESSION_AUDIO_EXTENSIONS.join(", ")}.`,
      );
    }
    const probe = await probeAudioDuration(audioPath);
    facts.push({
      path: audioPath,
      sizeBytes: stat.size,
      durationSeconds: probe.durationSeconds,
      probeError: probe.error,
    });
  }
  return facts;
}
