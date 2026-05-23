import { ArtifactKey, artifactLabels, JobStageName, jobStageLabels } from "./type.job.js";

export function humanizeEnumValue(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_-]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getJobStageLabel(stageName: JobStageName | null): string {
  return stageName ? jobStageLabels[stageName] : "Complete";
}

export function getArtifactLabel(artifactKey: ArtifactKey): string {
  return artifactLabels[artifactKey];
}

export function formatDisplayText(text: string): string {
  let formatted = text;

  for (const artifactKey of ArtifactKey.options) {
    formatted = formatted.replaceAll(artifactKey, getArtifactLabel(artifactKey));
  }

  for (const stageName of JobStageName.options) {
    formatted = formatted.replaceAll(stageName, getJobStageLabel(stageName));
  }

  return formatted;
}
