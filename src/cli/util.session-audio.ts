import { spawn } from "node:child_process";
import { SessionCliError } from "../shared/util.session.js";

export async function assertFfmpegAvailable(): Promise<void> {
  const code = await runCommand("ffmpeg", ["-version"]);
  if (code !== 0) {
    throw new SessionCliError(
      "ffmpeg is required to convert session recordings to 24 kHz PCM for the Realtime API. Install ffmpeg and try again.",
    );
  }
}

export async function probeAudioDuration(
  filePath: string,
): Promise<{ durationSeconds: number | null; error: string | null }> {
  try {
    const { code, stdout, stderr } = await captureCommand("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      filePath,
    ]);
    if (code !== 0) {
      return { durationSeconds: null, error: stderr.trim() || `ffprobe exited ${code}.` };
    }
    const parsed = JSON.parse(stdout) as { format?: { duration?: string } };
    const duration = Number(parsed.format?.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      return { durationSeconds: null, error: "ffprobe did not report a duration." };
    }
    return { durationSeconds: duration, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { durationSeconds: null, error: message };
  }
}

export interface PcmStreamRequest {
  filePath: string;
  startSeconds: number;
  durationSeconds: number | null;
  onFrame: (frame: Buffer) => Promise<void>;
}

export async function streamPcm16(request: PcmStreamRequest): Promise<number> {
  const args = ["-hide_banner", "-loglevel", "error"];
  if (request.startSeconds > 0) {
    args.push("-ss", request.startSeconds.toFixed(3));
  }
  args.push("-i", request.filePath);
  if (request.durationSeconds !== null) {
    args.push("-t", request.durationSeconds.toFixed(3));
  }
  args.push("-vn", "-ac", "1", "-ar", "24000", "-acodec", "pcm_s16le", "-f", "s16le", "pipe:1");

  const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });
  const exitCode = new Promise<number>((resolve, reject) => {
    child.on("error", (error) => {
      reject(
        new SessionCliError(
          `ffmpeg could not start (${error.message}). Install ffmpeg to convert recordings for the Realtime API.`,
        ),
      );
    });
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });

  const stdout = child.stdout;
  if (!stdout) {
    child.kill();
    throw new SessionCliError("ffmpeg did not provide audio output.");
  }

  const frameBytes = 24_000 * 2;
  let pending = Buffer.alloc(0);
  let sentBytes = 0;
  for await (const chunk of stdout) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    pending = Buffer.concat([pending, buffer]);
    while (pending.length >= frameBytes) {
      const frame = pending.subarray(0, frameBytes);
      pending = pending.subarray(frameBytes);
      await request.onFrame(Buffer.from(frame));
      sentBytes += frameBytes;
    }
  }
  if (pending.length >= 2) {
    const even = pending.length - (pending.length % 2);
    const frame = pending.subarray(0, even);
    await request.onFrame(Buffer.from(frame));
    sentBytes += even;
  }

  const code = await exitCode;
  if (code !== 0) {
    throw new SessionCliError(`ffmpeg could not read "${request.filePath}" (${code}). ${stderr.trim()}`.trim());
  }
  if (sentBytes === 0) {
    throw new SessionCliError(`ffmpeg produced no audio for "${request.filePath}".`);
  }
  return sentBytes;
}

async function runCommand(command: string, args: string[]): Promise<number> {
  try {
    return (await captureCommand(command, args)).code;
  } catch {
    return 1;
  }
}

function captureCommand(command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}
