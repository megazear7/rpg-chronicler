import path from "node:path";
import { SessionPresetId } from "../shared/type.session.js";
import { DEFAULT_OUTPUT_DIRECTORY, taskWritesNamedTranscriptDirectly } from "../shared/util.session.js";

export interface SessionOutputPlan {
  kind: "stdout" | "directory" | "file";
  directory?: string;
  resultPath?: string;
  transcriptPath?: string;
}

export function planSessionOutput(input: {
  output: string | undefined;
  presetId: SessionPresetId | undefined;
  instructions: string | undefined;
  outputIsDirectory: boolean;
}): SessionOutputPlan {
  const direct = taskWritesNamedTranscriptDirectly(input.presetId, input.instructions);
  const artifactName = `${input.presetId ?? "custom"}.md`;

  if (input.output === "-") {
    return { kind: "stdout" };
  }

  const directory =
    input.output === undefined || input.outputIsDirectory || input.output.endsWith("/") || input.output.endsWith("\\");
  if (directory) {
    const folder =
      input.output && input.output !== "-" ? input.output.replace(/[/\\]+$/u, "") : DEFAULT_OUTPUT_DIRECTORY;
    if (direct) {
      return { kind: "directory", directory: folder, transcriptPath: path.join(folder, "transcript.md") };
    }
    return {
      kind: "directory",
      directory: folder,
      transcriptPath: path.join(folder, "named-transcript.md"),
      resultPath: path.join(folder, artifactName),
    };
  }

  return { kind: "file", resultPath: input.output };
}

export function describeOutputPlan(plan: SessionOutputPlan): string {
  if (plan.kind === "stdout") {
    return "stdout";
  }
  if (plan.kind === "file") {
    return plan.resultPath ?? "the output file";
  }
  const files = [plan.transcriptPath, plan.resultPath].filter((file): file is string => Boolean(file));
  return `${plan.directory}/ (${files.map((file) => path.basename(file)).join(", ")})`;
}
