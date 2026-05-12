import path from "path";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import {
  ArtifactDetail,
  ArtifactKey,
  ArtifactSummary,
  ArtifactVersion,
  ArtifactVersionSource,
  artifactLabels,
  artifactOrder,
  JobContentful,
  JobDetail,
  JobIndex,
  JobListResponse,
  JobStage,
  JobStageName,
  JobStageStatus,
  jobStageLabels,
  jobStageOrder,
  JobStatus,
} from "../shared/type.job.js";

const JOBS_DIR = path.join(process.cwd(), "data", "jobs");

function now(): string {
  return new Date().toISOString();
}

function createStages(): JobStage[] {
  const timestamp = now();
  return jobStageOrder.map((name) =>
    JobStage.parse({
      name,
      label: jobStageLabels[name],
      status: JobStageStatus.enum.pending,
      progress: 0,
      updatedAt: timestamp,
    }),
  );
}

function createArtifacts(): ArtifactSummary[] {
  return artifactOrder.map((key) =>
    ArtifactSummary.parse({
      key,
      label: artifactLabels[key],
      activeVersionId: null,
      generatedVersionId: null,
      versionCount: 0,
      updatedAt: null,
    }),
  );
}

function createContentful(): JobContentful {
  return {
    status: "not_ready",
    title: null,
    summary: null,
    story: null,
    dmNotes: null,
    entryId: null,
    entryUrl: null,
    sentAt: null,
  };
}

function calculateTotalProgress(stages: JobStage[]): number {
  if (stages.length === 0) {
    return 0;
  }
  const total = stages.reduce((sum, stage) => sum + stage.progress, 0);
  return Math.round(total / stages.length);
}

function deriveJobStatus(job: JobIndex): JobStatus {
  if (job.errorMessage) {
    return JobStatus.enum.failed;
  }
  if (job.stages.every((stage) => stage.status === JobStageStatus.enum.completed)) {
    return JobStatus.enum.completed;
  }
  if (job.stages.some((stage) => stage.status === JobStageStatus.enum.running || stage.progress > 0)) {
    return JobStatus.enum.running;
  }
  return JobStatus.enum.queued;
}

function deriveCurrentStage(job: JobIndex): JobStageName | null {
  const runningStage = job.stages.find((stage) => stage.status === JobStageStatus.enum.running);
  if (runningStage) {
    return runningStage.name;
  }

  const pendingStage = job.stages.find((stage) => stage.status !== JobStageStatus.enum.completed);
  return pendingStage ? pendingStage.name : null;
}

function hydrateJob(job: JobIndex): JobIndex {
  const hydrated = JobIndex.parse({
    ...job,
    totalProgress: calculateTotalProgress(job.stages),
    updatedAt: now(),
  });
  hydrated.status = deriveJobStatus(hydrated);
  hydrated.currentStage = deriveCurrentStage(hydrated);
  hydrated.contentful.status =
    hydrated.contentful.entryId && hydrated.contentful.entryUrl ? "sent" : hasContentfulInputs(hydrated) ? "ready" : "not_ready";
  return hydrated;
}

function hasContentfulInputs(job: JobIndex): boolean {
  return Boolean(job.contentful.title && job.contentful.summary && job.contentful.story && job.contentful.dmNotes);
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export function getJobsDir(): string {
  return JOBS_DIR;
}

export function getJobDir(jobId: string): string {
  return path.join(JOBS_DIR, jobId);
}

export function getJobIndexPath(jobId: string): string {
  return path.join(getJobDir(jobId), "index.json");
}

export function getJobSourceDir(jobId: string): string {
  return path.join(getJobDir(jobId), "source");
}

export function getJobProgressDir(jobId: string): string {
  return path.join(getJobDir(jobId), "progress");
}

export function getJobArtifactsDir(jobId: string): string {
  return path.join(getJobDir(jobId), "artifacts");
}

export function getArtifactDir(jobId: string, key: ArtifactKey): string {
  return path.join(getJobArtifactsDir(jobId), key);
}

export function getArtifactVersionsDir(jobId: string, key: ArtifactKey): string {
  return path.join(getArtifactDir(jobId, key), "versions");
}

export async function createJob(fileName: string): Promise<JobIndex> {
  const id = randomUUID();
  const timestamp = now();
  const job = hydrateJob(
    JobIndex.parse({
      id,
      file: fileName,
      status: JobStatus.enum.queued,
      totalProgress: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      currentStage: JobStageName.enum.upload,
      errorMessage: null,
      stages: createStages(),
      artifacts: createArtifacts(),
      contentful: createContentful(),
    }),
  );

  await ensureDir(getJobSourceDir(id));
  await ensureDir(getJobProgressDir(id));
  await ensureDir(getJobArtifactsDir(id));
  await writeJob(job);
  return job;
}

export async function writeJob(job: JobIndex): Promise<JobIndex> {
  const hydrated = hydrateJob(job);
  await ensureDir(getJobDir(hydrated.id));
  await fs.writeFile(getJobIndexPath(hydrated.id), JSON.stringify(hydrated, null, 2), "utf-8");
  return hydrated;
}

export async function readJob(jobId: string): Promise<JobIndex> {
  const file = await fs.readFile(getJobIndexPath(jobId), "utf-8");
  return JobIndex.parse(JSON.parse(file));
}

export async function updateJob(jobId: string, updater: (job: JobIndex) => JobIndex | Promise<JobIndex>): Promise<JobIndex> {
  const current = await readJob(jobId);
  const next = await updater(current);
  return writeJob(next);
}

export async function updateStage(
  jobId: string,
  name: JobStageName,
  status: JobStageStatus,
  progress: number,
  message?: string,
): Promise<JobIndex> {
  return updateJob(jobId, (job) => {
    const updatedStages = job.stages.map((stage) =>
      stage.name === name
        ? {
            ...stage,
            status,
            progress,
            updatedAt: now(),
            message,
          }
        : stage,
    );
    return JobIndex.parse({
      ...job,
      errorMessage: status === JobStageStatus.enum.failed ? message ?? job.errorMessage : job.errorMessage,
      stages: updatedStages,
    });
  });
}

export async function failJob(jobId: string, name: JobStageName, message: string): Promise<JobIndex> {
  return updateJob(jobId, (job) => {
    const updatedStages = job.stages.map((stage) =>
      stage.name === name
        ? {
            ...stage,
            status: JobStageStatus.enum.failed,
            updatedAt: now(),
            message,
          }
        : stage,
    );
    return JobIndex.parse({
      ...job,
      errorMessage: message,
      stages: updatedStages,
    });
  });
}

export async function saveArtifactVersion(
  jobId: string,
  key: ArtifactKey,
  text: string,
  source: ArtifactVersionSource,
): Promise<ArtifactVersion> {
  const version = ArtifactVersion.parse({
    id: randomUUID(),
    createdAt: now(),
    source,
    text,
  });
  const versionsDir = getArtifactVersionsDir(jobId, key);
  await ensureDir(versionsDir);
  await fs.writeFile(path.join(versionsDir, `${version.id}.json`), JSON.stringify(version, null, 2), "utf-8");

  await updateJob(jobId, (job) => {
    const artifacts = job.artifacts.map((artifact) => {
      if (artifact.key !== key) {
        return artifact;
      }
      return ArtifactSummary.parse({
        ...artifact,
        activeVersionId: version.id,
        generatedVersionId: source === "generated" && artifact.generatedVersionId === null ? version.id : artifact.generatedVersionId,
        versionCount: artifact.versionCount + 1,
        updatedAt: version.createdAt,
      });
    });

    const contentful = {
      ...job.contentful,
      title: key === "title" ? text : job.contentful.title,
      summary: key === "summary" ? text : job.contentful.summary,
      story: key === "story" ? text : job.contentful.story,
      dmNotes: key === "dmNotes" ? text : job.contentful.dmNotes,
    };

    return JobIndex.parse({
      ...job,
      artifacts,
      contentful,
    });
  });

  return version;
}

async function readArtifactVersion(jobId: string, key: ArtifactKey, versionId: string): Promise<ArtifactVersion> {
  const content = await fs.readFile(path.join(getArtifactVersionsDir(jobId, key), `${versionId}.json`), "utf-8");
  return ArtifactVersion.parse(JSON.parse(content));
}

export async function listArtifactVersions(jobId: string, key: ArtifactKey): Promise<ArtifactVersion[]> {
  const versionsDir = getArtifactVersionsDir(jobId, key);
  try {
    const files = (await fs.readdir(versionsDir)).filter((file) => file.endsWith(".json")).sort();
    const versions = await Promise.all(
      files.map(async (file) => {
        const content = await fs.readFile(path.join(versionsDir, file), "utf-8");
        return ArtifactVersion.parse(JSON.parse(content));
      }),
    );
    return versions.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch {
    return [];
  }
}

async function syncArtifactSummary(jobId: string, key: ArtifactKey, versions: ArtifactVersion[]): Promise<void> {
  const nonDeletedVersions = versions.filter((version) => !version.deletedAt);
  const latestActiveVersion = nonDeletedVersions[0] ?? null;
  await updateJob(jobId, (job) => {
    const artifacts = job.artifacts.map((artifact) => {
      if (artifact.key !== key) {
        return artifact;
      }
      const generatedVersion = versions.find((version) => version.id === artifact.generatedVersionId && !version.deletedAt) ?? null;
      return ArtifactSummary.parse({
        ...artifact,
        activeVersionId: latestActiveVersion?.id ?? null,
        generatedVersionId: generatedVersion?.id ?? null,
        versionCount: nonDeletedVersions.length,
        updatedAt: latestActiveVersion?.createdAt ?? artifact.updatedAt,
      });
    });

    const activeText = latestActiveVersion?.text ?? null;
    const contentful = {
      ...job.contentful,
      title: key === "title" ? activeText : job.contentful.title,
      summary: key === "summary" ? activeText : job.contentful.summary,
      story: key === "story" ? activeText : job.contentful.story,
      dmNotes: key === "dmNotes" ? activeText : job.contentful.dmNotes,
    };

    return JobIndex.parse({
      ...job,
      artifacts,
      contentful,
    });
  });
}

export async function readArtifact(jobId: string, key: ArtifactKey): Promise<ArtifactDetail> {
  const job = await readJob(jobId);
  const summary = job.artifacts.find((artifact) => artifact.key === key);
  if (!summary) {
    throw new Error(`Artifact ${key} not found.`);
  }
  const versions = await listArtifactVersions(jobId, key);
  const activeVersion = summary.activeVersionId ? versions.find((version) => version.id === summary.activeVersionId) ?? null : null;
  return ArtifactDetail.parse({
    ...summary,
    activeVersion,
    versions,
  });
}

export async function editArtifact(jobId: string, key: ArtifactKey, text: string): Promise<ArtifactDetail> {
  await saveArtifactVersion(jobId, key, text, "edited");
  return readArtifact(jobId, key);
}

export async function activateArtifactVersion(jobId: string, key: ArtifactKey, versionId: string): Promise<ArtifactDetail> {
  const version = await readArtifactVersion(jobId, key, versionId);
  if (version.deletedAt) {
    throw new Error("Cannot activate a deleted artifact version.");
  }

  await updateJob(jobId, (job) => {
    const artifacts = job.artifacts.map((artifact) => {
      if (artifact.key !== key) {
        return artifact;
      }
      return ArtifactSummary.parse({
        ...artifact,
        activeVersionId: versionId,
        updatedAt: now(),
      });
    });

    const contentful = {
      ...job.contentful,
      title: key === "title" ? version.text : job.contentful.title,
      summary: key === "summary" ? version.text : job.contentful.summary,
      story: key === "story" ? version.text : job.contentful.story,
      dmNotes: key === "dmNotes" ? version.text : job.contentful.dmNotes,
    };

    return JobIndex.parse({
      ...job,
      artifacts,
      contentful,
    });
  });

  return readArtifact(jobId, key);
}

export async function deleteArtifactVersion(jobId: string, key: ArtifactKey, versionId: string): Promise<ArtifactDetail> {
  const version = await readArtifactVersion(jobId, key, versionId);
  const deletedVersion = ArtifactVersion.parse({
    ...version,
    deletedAt: now(),
  });
  await fs.writeFile(path.join(getArtifactVersionsDir(jobId, key), `${versionId}.json`), JSON.stringify(deletedVersion, null, 2), "utf-8");
  const versions = await listArtifactVersions(jobId, key);
  await syncArtifactSummary(jobId, key, versions);
  return readArtifact(jobId, key);
}

export async function readJobDetail(jobId: string): Promise<JobDetail> {
  const job = await readJob(jobId);
  const artifactVersions = Object.fromEntries(
    await Promise.all(artifactOrder.map(async (key) => [key, await listArtifactVersions(jobId, key)])),
  );
  return JobDetail.parse({
    ...job,
    artifactVersions,
  });
}

export async function listJobs(page: number, pageSize: number): Promise<JobListResponse> {
  await ensureDir(JOBS_DIR);
  const entries = await fs.readdir(JOBS_DIR);
  const jobs = await Promise.all(
    entries.map(async (entry) => {
      try {
        return await readJob(entry);
      } catch {
        return null;
      }
    }),
  );
  const items = jobs
    .filter((job): job is JobIndex => job !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const start = (page - 1) * pageSize;
  return JobListResponse.parse({
    page,
    pageSize,
    total: items.length,
    items: items.slice(start, start + pageSize),
  });
}