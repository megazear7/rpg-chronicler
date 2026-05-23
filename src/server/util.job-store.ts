import path from "path";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import z from "zod";
import {
  ArtifactDetail,
  ArtifactKey,
  JobArtifactOutput,
  JobAudioFile,
  ArtifactSummary,
  ArtifactVersion,
  ArtifactVersionSource,
  artifactLabels,
  artifactOrder,
  JobContentful,
  JobDetail,
  JobImageState,
  JobImageAsset,
  JobImagePrompt,
  JobLogEntry,
  JobLogLevel,
  JobNotionState,
  JobIndex,
  JobSongState,
  JobListResponse,
  JobStage,
  JobStageName,
  JobStageStatus,
  jobStageKinds,
  jobStageLabels,
  jobStageOrder,
  JobStatus,
} from "../shared/type.job.js";
import { ContentfulSubmissionSnapshot } from "../shared/type.contentful-context.js";
import { createEmptyUsageBreakdown, normalizeUsageBreakdown } from "../shared/util.usage.js";

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
      kind: jobStageKinds[name],
      status: JobStageStatus.enum.pending,
      progress: 0,
      updatedAt: timestamp,
      usage: createEmptyUsageBreakdown(),
    }),
  );
}

function createImageState(): JobImageState {
  return {
    status: "not_ready",
    prompts: [],
    generatedAssets: [],
    lastGeneratedAt: null,
  };
}

function normalizeImageState(image: unknown): JobImageState {
  const base = typeof image === "object" && image !== null ? (image as Record<string, unknown>) : {};
  const generatedAssetsInput = Array.isArray(base.generatedAssets) ? base.generatedAssets : [];
  const promptsInput = Array.isArray(base.prompts) ? base.prompts : [];

  const prompts =
    promptsInput.length > 0
      ? promptsInput.map((prompt) =>
          JobImagePrompt.parse({
            ...(typeof prompt === "object" && prompt !== null ? prompt : {}),
            id:
              typeof (prompt as { id?: unknown })?.id === "string"
                ? (prompt as { id: string }).id
                : `prompt-${promptsInput.indexOf(prompt) + 1}`,
            label:
              typeof (prompt as { label?: unknown })?.label === "string"
                ? (prompt as { label: string }).label
                : `Image ${promptsInput.indexOf(prompt) + 1}`,
            storyPart:
              typeof (prompt as { storyPart?: unknown })?.storyPart === "string"
                ? (prompt as { storyPart: string }).storyPart
                : `Part ${promptsInput.indexOf(prompt) + 1}`,
            prompt:
              typeof (prompt as { prompt?: unknown })?.prompt === "string" ? (prompt as { prompt: string }).prompt : "",
          }),
        )
      : generatedAssetsInput.map((asset, index) =>
          JobImagePrompt.parse({
            id: `legacy-prompt-${index + 1}`,
            label: `Image ${index + 1}`,
            storyPart: `Part ${index + 1}`,
            prompt:
              typeof (asset as { prompt?: unknown })?.prompt === "string" ? (asset as { prompt: string }).prompt : "",
          }),
        );

  const legacySelectedAssetId = typeof base.selectedAssetId === "string" ? base.selectedAssetId : null;
  const generatedAssets = generatedAssetsInput.map((asset, index) => {
    const candidate = typeof asset === "object" && asset !== null ? (asset as Record<string, unknown>) : {};
    const promptId =
      typeof candidate.promptId === "string"
        ? candidate.promptId
        : (prompts[index]?.id ?? prompts[0]?.id ?? `legacy-prompt-${index + 1}`);
    const approvedAt =
      typeof candidate.approvedAt === "string"
        ? candidate.approvedAt
        : legacySelectedAssetId && typeof candidate.id === "string" && candidate.id === legacySelectedAssetId
          ? now()
          : null;
    return JobImageAsset.parse({
      ...candidate,
      promptId,
      approvedAt,
      rejectedAt: typeof candidate.rejectedAt === "string" ? candidate.rejectedAt : null,
    });
  });

  const reviewedCount = generatedAssets.filter((asset) => asset.approvedAt || asset.rejectedAt).length;
  const totalCount = generatedAssets.length > 0 ? generatedAssets.length : prompts.length;
  const approvedCount = generatedAssets.filter((asset) => asset.approvedAt && !asset.rejectedAt).length;
  const status = (() => {
    if (typeof base.status !== "string") {
      if (generatedAssets.length === 0) {
        return JobImageState.shape.status.enum.not_ready;
      }
      if (totalCount > 0 && reviewedCount >= totalCount) {
        return approvedCount > 0 ? JobImageState.shape.status.enum.approved : JobImageState.shape.status.enum.reviewed;
      }
      return JobImageState.shape.status.enum.awaiting_approval;
    }
    if (base.status === "approved" && totalCount > 0 && reviewedCount < totalCount) {
      return JobImageState.shape.status.enum.awaiting_approval;
    }
    return JobImageState.shape.status.parse(base.status);
  })();

  return JobImageState.parse({
    status,
    prompts,
    generatedAssets,
    lastGeneratedAt: typeof base.lastGeneratedAt === "string" ? base.lastGeneratedAt : null,
  });
}

function createSongState(): JobSongState {
  return {
    status: "not_ready",
    provider: "manual",
    externalSongId: null,
    songUrl: null,
    selectedAt: null,
  };
}

function createNotionState(): JobNotionState {
  return {
    status: "not_ready",
    pageId: null,
    pageUrl: null,
    sentAt: null,
  };
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
  if (job.pausedAt) {
    return JobStatus.enum.paused;
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

  const pausedStage = job.stages.find((stage) => stage.status === JobStageStatus.enum.paused);
  if (pausedStage) {
    return pausedStage.name;
  }

  const pendingStage = job.stages.find((stage) => stage.status !== JobStageStatus.enum.completed);
  return pendingStage ? pendingStage.name : null;
}

function normalizeStages(stages: unknown): JobStage[] {
  const existing = Array.isArray(stages) ? stages : [];
  const stageMap = new Map<string, Partial<JobStage> & Pick<JobStage, "name">>();
  for (const stage of existing) {
    if (stage && typeof stage === "object" && typeof (stage as { name?: string }).name === "string") {
      stageMap.set((stage as { name: string }).name, stage as Partial<JobStage> & Pick<JobStage, "name">);
    }
  }

  const workflowHadStarted = existing.some((stage) => {
    if (!stage || typeof stage !== "object") {
      return false;
    }

    const candidate = stage as { status?: unknown; progress?: unknown };
    return (
      candidate.status === JobStageStatus.enum.running ||
      candidate.status === JobStageStatus.enum.completed ||
      (typeof candidate.progress === "number" && candidate.progress > 0)
    );
  });

  return jobStageOrder.map((name) => {
    const base = stageMap.get(name);
    const inferredConfigureContext = !base && name === "configure_context" && workflowHadStarted;
    return JobStage.parse({
      name,
      label: jobStageLabels[name],
      kind: jobStageKinds[name],
      status: base?.status ?? (inferredConfigureContext ? JobStageStatus.enum.completed : JobStageStatus.enum.pending),
      progress: base?.progress ?? (inferredConfigureContext ? 100 : 0),
      updatedAt: base?.updatedAt ?? now(),
      usage: normalizeUsageBreakdown(base?.usage),
      message:
        base?.message ??
        (inferredConfigureContext ? "Legacy job imported before context selection existed." : undefined),
    });
  });
}

function normalizeJob(job: unknown): JobIndex {
  const base = typeof job === "object" && job !== null ? (job as Record<string, unknown>) : {};
  const stages = normalizeStages(base.stages);
  const notionStage = stages.find((stage) => stage.name === "notion");
  const notionBase = base.notion ?? createNotionState();
  const notionStatus =
    typeof (notionBase as { status?: unknown }).status === "string"
      ? (notionBase as { status: string }).status
      : createNotionState().status;
  const normalizedNotion =
    notionStatus === "sending" && notionStage?.status === JobStageStatus.enum.failed
      ? {
          ...notionBase,
          status: "failed",
        }
      : notionBase;

  return JobIndex.parse({
    ...base,
    processingRunId:
      typeof base.processingRunId === "string" && base.processingRunId.length > 0
        ? base.processingRunId
        : typeof base.id === "string" && base.id.length > 0
          ? base.id
          : randomUUID(),
    instructionsText: typeof base.instructionsText === "string" ? base.instructionsText : null,
    submission: base.submission ?? null,
    status: typeof base.status === "string" ? base.status : JobStatus.enum.queued,
    totalProgress: typeof base.totalProgress === "number" ? base.totalProgress : 0,
    createdAt: typeof base.createdAt === "string" ? base.createdAt : now(),
    updatedAt: typeof base.updatedAt === "string" ? base.updatedAt : now(),
    pausedAt: typeof base.pausedAt === "string" ? base.pausedAt : null,
    archivedAt: typeof base.archivedAt === "string" ? base.archivedAt : null,
    currentStage: base.currentStage ?? null,
    usage: normalizeUsageBreakdown(base.usage),
    errorMessage: typeof base.errorMessage === "string" ? base.errorMessage : null,
    stages,
    artifacts: Array.isArray(base.artifacts) ? base.artifacts : createArtifacts(),
    image: normalizeImageState(base.image),
    song: base.song ?? createSongState(),
    contentful: base.contentful ?? createContentful(),
    notion: normalizedNotion,
  });
}

function hydrateJob(job: JobIndex): JobIndex {
  const normalized = normalizeJob(job);
  const hydrated = JobIndex.parse({
    ...normalized,
    totalProgress: calculateTotalProgress(normalized.stages),
    updatedAt: now(),
  });
  hydrated.status = deriveJobStatus(hydrated);
  hydrated.currentStage = deriveCurrentStage(hydrated);
  hydrated.contentful.status =
    hydrated.contentful.entryId && hydrated.contentful.entryUrl
      ? "sent"
      : hasContentfulInputs(hydrated)
        ? "ready"
        : "not_ready";
  return hydrated;
}

function hasContentfulInputs(job: JobIndex): boolean {
  const imageReviewComplete = job.stages.find((stage) => stage.name === "image_approval")?.status === "completed";
  return Boolean(
    job.contentful.title &&
    job.contentful.summary &&
    job.contentful.story &&
    job.contentful.dmNotes &&
    imageReviewComplete &&
    job.song.songUrl,
  );
}

function summarizeImageReview(image: JobImageState): { total: number; reviewed: number; approved: number } {
  const total = image.generatedAssets.length;
  const reviewed = image.generatedAssets.filter((asset) => asset.approvedAt || asset.rejectedAt).length;
  const approved = image.generatedAssets.filter((asset) => asset.approvedAt && !asset.rejectedAt).length;
  return { total, reviewed, approved };
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

export function getJobLogsPath(jobId: string): string {
  return path.join(getJobDir(jobId), "logs.json");
}

export function getJobSourceDir(jobId: string): string {
  return path.join(getJobDir(jobId), "source");
}

export function getJobProgressDir(jobId: string): string {
  return path.join(getJobDir(jobId), "progress");
}

export function getJobAudioPartsDir(jobId: string): string {
  return path.join(getJobProgressDir(jobId), "audio-parts");
}

export function getJobArtifactsDir(jobId: string): string {
  return path.join(getJobDir(jobId), "artifacts");
}

export function getJobImagesDir(jobId: string): string {
  return path.join(getJobDir(jobId), "images");
}

export function getJobImagePath(jobId: string, fileName: string): string {
  return path.join(getJobImagesDir(jobId), fileName);
}

export function getArtifactDir(jobId: string, key: ArtifactKey): string {
  return path.join(getJobArtifactsDir(jobId), key);
}

export function getArtifactVersionsDir(jobId: string, key: ArtifactKey): string {
  return path.join(getArtifactDir(jobId, key), "versions");
}

export function getArtifactOutputsDir(jobId: string, key: ArtifactKey): string {
  return path.join(getArtifactDir(jobId, key), "outputs");
}

export async function createJob(
  fileName: string,
  instructionsText: string,
  submission: ContentfulSubmissionSnapshot | null,
): Promise<JobIndex> {
  const id = randomUUID();
  const timestamp = now();
  const job = hydrateJob(
    JobIndex.parse({
      id,
      processingRunId: randomUUID(),
      file: fileName,
      instructionsText,
      submission,
      status: JobStatus.enum.queued,
      totalProgress: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      pausedAt: null,
      archivedAt: null,
      currentStage: JobStageName.enum.upload,
      usage: createEmptyUsageBreakdown(),
      errorMessage: null,
      stages: createStages(),
      artifacts: createArtifacts(),
      image: createImageState(),
      song: createSongState(),
      contentful: createContentful(),
      notion: createNotionState(),
    }),
  );

  await ensureDir(getJobSourceDir(id));
  await ensureDir(getJobProgressDir(id));
  await ensureDir(getJobArtifactsDir(id));
  await ensureDir(getJobImagesDir(id));
  await fs.writeFile(getJobLogsPath(id), JSON.stringify([], null, 2), "utf-8");
  await writeJob(job);
  await appendJobLog(id, "info", "upload", `Created job for ${fileName}.`);
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
  return hydrateJob(normalizeJob(JSON.parse(file)));
}

export async function updateJob(
  jobId: string,
  updater: (job: JobIndex) => JobIndex | Promise<JobIndex>,
): Promise<JobIndex> {
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
  const updatedJob = await updateJob(jobId, (job) => {
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
      errorMessage: status === JobStageStatus.enum.failed ? (message ?? job.errorMessage) : job.errorMessage,
      stages: updatedStages,
    });
  });

  if (message) {
    const level =
      status === JobStageStatus.enum.failed
        ? JobLogLevel.enum.error
        : status === JobStageStatus.enum.completed
          ? JobLogLevel.enum.success
          : JobLogLevel.enum.info;
    await appendJobLog(jobId, level, name, message);
  }

  return updatedJob;
}

export async function failJob(jobId: string, name: JobStageName, message: string): Promise<JobIndex> {
  const failedJob = await updateJob(jobId, (job) => {
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
  await appendJobLog(jobId, "error", name, message);
  return failedJob;
}

export async function resetJobForRestart(
  jobId: string,
  restartStage: JobStageName,
  options?: { resetFutureStages?: boolean },
): Promise<JobIndex> {
  const restartIndex = jobStageOrder.indexOf(restartStage);
  const resetFutureStages = options?.resetFutureStages ?? true;

  if (restartIndex < 0) {
    throw new Error(`Unknown restart stage: ${restartStage}`);
  }

  const shouldResetImageState = restartStage === "image_generation";
  const shouldResetSongState = restartStage === "lyrics" || restartStage === "song_prompt";

  return updateJob(jobId, (job) =>
    JobIndex.parse({
      ...job,
      processingRunId: randomUUID(),
      pausedAt: null,
      errorMessage: null,
      stages: job.stages.map((stage) => {
        const stageIndex = jobStageOrder.indexOf(stage.name);
        const shouldResetStage = resetFutureStages ? stageIndex >= restartIndex : stage.name === restartStage;

        if (!shouldResetStage) {
          return stage;
        }

        return {
          ...stage,
          status: JobStageStatus.enum.pending,
          progress: 0,
          updatedAt: now(),
          message: undefined,
        };
      }),
      image: shouldResetImageState ? createImageState() : job.image,
      song: shouldResetSongState ? createSongState() : job.song,
      contentful: {
        ...job.contentful,
        status: "not_ready",
        entryId: null,
        entryUrl: null,
        sentAt: null,
      },
      notion: restartIndex <= jobStageOrder.indexOf("notion") ? createNotionState() : job.notion,
    }),
  );
}

export async function appendJobLog(
  jobId: string,
  level: JobLogLevel,
  stage: JobStageName | null,
  message: string,
): Promise<JobLogEntry> {
  const entry = JobLogEntry.parse({
    id: randomUUID(),
    createdAt: now(),
    level,
    stage,
    message,
  });
  const logs = await readJobLogs(jobId);
  logs.unshift(entry);
  await fs.writeFile(getJobLogsPath(jobId), JSON.stringify(logs.slice(0, 500), null, 2), "utf-8");
  return entry;
}

export async function readJobLogs(jobId: string): Promise<JobLogEntry[]> {
  try {
    const content = await fs.readFile(getJobLogsPath(jobId), "utf-8");
    return z.array(JobLogEntry).parse(JSON.parse(content));
  } catch {
    return [];
  }
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
        generatedVersionId:
          source === "generated" && artifact.generatedVersionId === null ? version.id : artifact.generatedVersionId,
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

  await appendJobLog(
    jobId,
    source === "generated" ? "success" : "info",
    null,
    `${artifactLabels[key]} ${source === "generated" ? "generated" : "saved as a new edited version"}.`,
  );

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
      const generatedVersion =
        versions.find((version) => version.id === artifact.generatedVersionId && !version.deletedAt) ?? null;
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
  const activeVersion = summary.activeVersionId
    ? (versions.find((version) => version.id === summary.activeVersionId) ?? null)
    : null;
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

export async function activateArtifactVersion(
  jobId: string,
  key: ArtifactKey,
  versionId: string,
): Promise<ArtifactDetail> {
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

export async function deleteArtifactVersion(
  jobId: string,
  key: ArtifactKey,
  versionId: string,
): Promise<ArtifactDetail> {
  const version = await readArtifactVersion(jobId, key, versionId);
  const deletedVersion = ArtifactVersion.parse({
    ...version,
    deletedAt: now(),
  });
  await fs.writeFile(
    path.join(getArtifactVersionsDir(jobId, key), `${versionId}.json`),
    JSON.stringify(deletedVersion, null, 2),
    "utf-8",
  );
  const versions = await listArtifactVersions(jobId, key);
  await syncArtifactSummary(jobId, key, versions);
  return readArtifact(jobId, key);
}

export async function readJobDetail(jobId: string): Promise<JobDetail> {
  const job = await readJob(jobId);
  const artifactVersions = Object.fromEntries(
    await Promise.all(artifactOrder.map(async (key) => [key, await listArtifactVersions(jobId, key)])),
  );
  const logs = await readJobLogs(jobId);
  const audioFiles = await listJobAudioFiles(jobId);
  const bulletPointOutputs = await listArtifactOutputs(jobId, "bulletPoints");
  return JobDetail.parse({
    ...job,
    artifactVersions,
    logs,
    audioFiles,
    bulletPointOutputs,
  });
}

export async function saveArtifactOutput(
  jobId: string,
  key: ArtifactKey,
  id: string,
  label: string,
  text: string,
): Promise<void> {
  const output = JobArtifactOutput.parse({
    id,
    label,
    text,
    createdAt: now(),
  });
  const outputsDir = getArtifactOutputsDir(jobId, key);
  await ensureDir(outputsDir);
  await fs.writeFile(path.join(outputsDir, `${id}.json`), JSON.stringify(output, null, 2), "utf-8");
}

export async function readArtifactOutput(
  jobId: string,
  key: ArtifactKey,
  id: string,
): Promise<JobArtifactOutput | null> {
  try {
    const content = await fs.readFile(path.join(getArtifactOutputsDir(jobId, key), `${id}.json`), "utf-8");
    return JobArtifactOutput.parse(JSON.parse(content));
  } catch {
    return null;
  }
}

export async function listArtifactOutputs(jobId: string, key: ArtifactKey): Promise<JobArtifactOutput[]> {
  const outputsDir = getArtifactOutputsDir(jobId, key);
  try {
    const files = (await fs.readdir(outputsDir)).filter((file) => file.endsWith(".json")).sort();
    const outputs = await Promise.all(
      files.map(async (file) => {
        const content = await fs.readFile(path.join(outputsDir, file), "utf-8");
        return JobArtifactOutput.parse(JSON.parse(content));
      }),
    );
    return outputs.sort((left, right) => left.id.localeCompare(right.id));
  } catch {
    return [];
  }
}

export async function listJobAudioFiles(jobId: string): Promise<JobAudioFile[]> {
  const sourceDir = getJobSourceDir(jobId);
  const audioPartsDir = getJobAudioPartsDir(jobId);
  const audioFiles: JobAudioFile[] = [];

  const processedPath = path.join(sourceDir, "processed.mp3");
  try {
    await fs.access(processedPath);
    audioFiles.push(
      JobAudioFile.parse({
        fileName: "processed.mp3",
        label: "Prepared audio",
        kind: "prepared",
        durationSeconds: await getAudioDuration(processedPath),
      }),
    );
  } catch {
    // Ignore missing prepared audio.
  }

  try {
    const partNames = (await fs.readdir(audioPartsDir))
      .filter((entry) => entry.toLowerCase().endsWith(".mp3"))
      .sort((left, right) => left.localeCompare(right));

    const partFiles = await Promise.all(
      partNames.map(async (fileName, index) =>
        JobAudioFile.parse({
          fileName,
          label: `Split part ${index + 1}`,
          kind: "split",
          durationSeconds: await getAudioDuration(path.join(audioPartsDir, fileName)),
        }),
      ),
    );
    audioFiles.push(...partFiles);
  } catch {
    // Ignore missing split audio directory.
  }

  return audioFiles;
}

async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, metadata) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(metadata.format.duration ?? 0);
    });
  });
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    default:
      return ".png";
  }
}

export async function saveGeneratedImageAsset(
  jobId: string,
  promptId: string,
  prompt: string,
  buffer: Buffer,
  mimeType: string,
  source: "generated" | "uploaded" = "generated",
): Promise<JobImageAsset> {
  const id = randomUUID();
  const createdAt = now();
  const fileName = `${id}${extensionForMimeType(mimeType)}`;
  await ensureDir(getJobImagesDir(jobId));
  await fs.writeFile(getJobImagePath(jobId, fileName), buffer);

  const asset = {
    id,
    promptId,
    createdAt,
    prompt,
    fileName,
    mimeType,
    source,
    approvedAt: null,
    rejectedAt: null,
  };

  await updateJob(jobId, (job) =>
    JobIndex.parse({
      ...job,
      image: {
        ...job.image,
        status: "awaiting_approval",
        generatedAssets: [asset, ...job.image.generatedAssets],
        lastGeneratedAt: createdAt,
      },
    }),
  );
  await appendJobLog(jobId, "success", "image_generation", `Saved ${source} image candidate.`);
  return asset;
}

export async function approveImageAsset(jobId: string, assetId: string): Promise<JobDetail> {
  const updated = await updateJob(jobId, (job) =>
    JobIndex.parse({
      ...job,
      image: {
        ...job.image,
        generatedAssets: job.image.generatedAssets.map((asset) => ({
          ...asset,
          approvedAt: asset.id === assetId ? now() : (asset.approvedAt ?? null),
          rejectedAt: asset.id === assetId ? null : (asset.rejectedAt ?? null),
        })),
      },
    }),
  );
  const summary = summarizeImageReview(updated.image);
  const stageComplete = summary.total > 0 && summary.reviewed >= summary.total;
  await updateStage(
    jobId,
    "image_approval",
    stageComplete ? "completed" : "running",
    summary.total === 0 ? 0 : Math.round((summary.reviewed / summary.total) * 100),
    stageComplete
      ? `Image review complete. ${summary.approved} of ${summary.total} images approved.`
      : `Reviewed ${summary.reviewed} of ${summary.total} images.`,
  );
  await updateJob(jobId, (job) =>
    JobIndex.parse({
      ...job,
      image: {
        ...job.image,
        status: stageComplete ? (summary.approved > 0 ? "approved" : "reviewed") : "awaiting_approval",
      },
    }),
  );
  return readJobDetail(jobId);
}

export async function rejectImageAsset(jobId: string, assetId: string): Promise<JobDetail> {
  const updated = await updateJob(jobId, (job) =>
    JobIndex.parse({
      ...job,
      image: {
        ...job.image,
        generatedAssets: job.image.generatedAssets.map((asset) => ({
          ...asset,
          approvedAt: asset.id === assetId ? null : (asset.approvedAt ?? null),
          rejectedAt: asset.id === assetId ? now() : (asset.rejectedAt ?? null),
        })),
      },
    }),
  );
  const summary = summarizeImageReview(updated.image);
  const stageComplete = summary.total > 0 && summary.reviewed >= summary.total;
  await updateStage(
    jobId,
    "image_approval",
    stageComplete ? "completed" : "running",
    summary.total === 0 ? 0 : Math.round((summary.reviewed / summary.total) * 100),
    stageComplete
      ? `Image review complete. ${summary.approved} of ${summary.total} images approved.`
      : `Reviewed ${summary.reviewed} of ${summary.total} images.`,
  );
  await updateJob(jobId, (job) =>
    JobIndex.parse({
      ...job,
      image: {
        ...job.image,
        status: stageComplete ? (summary.approved > 0 ? "approved" : "reviewed") : "awaiting_approval",
      },
    }),
  );
  return readJobDetail(jobId);
}

export async function selectSong(
  jobId: string,
  songUrl: string,
  provider: "manual" | "suno" = "manual",
  externalSongId?: string | null,
): Promise<JobIndex> {
  const selectedAt = now();
  const updated = await updateJob(jobId, (job) =>
    JobIndex.parse({
      ...job,
      song: {
        ...job.song,
        status: "selected",
        provider,
        externalSongId: externalSongId ?? null,
        songUrl,
        selectedAt,
      },
    }),
  );
  await updateStage(
    jobId,
    "song_approval",
    "completed",
    100,
    provider === "suno" ? "Suno song selected." : "Song selected.",
  );
  return updated;
}

export async function markNotionReady(jobId: string): Promise<JobIndex> {
  return updateJob(jobId, (job) =>
    JobIndex.parse({
      ...job,
      notion: {
        ...job.notion,
        status: job.contentful.entryId ? "ready" : job.notion.status,
      },
    }),
  );
}

export async function setContentfulEntryReference(jobId: string, entryId: string, entryUrl: string): Promise<JobIndex> {
  const sentAt = now();
  return updateJob(jobId, (job) =>
    JobIndex.parse({
      ...job,
      contentful: {
        ...job.contentful,
        status: "sent",
        entryId,
        entryUrl,
        sentAt,
      },
    }),
  );
}

export async function setNotionPageReference(jobId: string, pageId: string, pageUrl: string): Promise<JobIndex> {
  const sentAt = now();
  return updateJob(jobId, (job) =>
    JobIndex.parse({
      ...job,
      notion: {
        ...job.notion,
        status: "sent",
        pageId,
        pageUrl,
        sentAt,
      },
    }),
  );
}

export async function archiveJob(jobId: string): Promise<JobIndex> {
  return updateJob(jobId, (job) =>
    JobIndex.parse({
      ...job,
      archivedAt: job.archivedAt ?? now(),
    }),
  );
}

export async function restoreJob(jobId: string): Promise<JobIndex> {
  return updateJob(jobId, (job) =>
    JobIndex.parse({
      ...job,
      archivedAt: null,
    }),
  );
}

export async function pauseJob(jobId: string): Promise<JobIndex> {
  const updatedJob = await updateJob(jobId, (job) => {
    const runningStages = job.stages.filter(
      (stage) => stage.status === JobStageStatus.enum.running && stage.kind === "ai",
    );
    const stageNamesToPause = new Set(runningStages.map((stage) => stage.name));

    if (runningStages.length === 0) {
      if (job.stages.some((stage) => stage.status === JobStageStatus.enum.paused && stage.kind === "ai")) {
        return job;
      }

      const currentStage = job.currentStage
        ? (job.stages.find((stage) => stage.name === job.currentStage) ?? null)
        : null;
      if (
        currentStage &&
        currentStage.kind === "ai" &&
        currentStage.status !== JobStageStatus.enum.completed &&
        currentStage.status !== JobStageStatus.enum.failed
      ) {
        stageNamesToPause.add(currentStage.name);
      }

      if (stageNamesToPause.size === 0) {
        throw new Error("Only actively running AI jobs can be paused.");
      }
    }

    return JobIndex.parse({
      ...job,
      pausedAt: now(),
      stages: job.stages.map((stage) =>
        stageNamesToPause.has(stage.name)
          ? {
              ...stage,
              status: JobStageStatus.enum.paused,
              updatedAt: now(),
              message: stage.message ?? "Processing paused.",
            }
          : stage,
      ),
    });
  });

  await appendJobLog(jobId, "warning", updatedJob.currentStage, "Job paused.");
  return updatedJob;
}

export async function resumeJob(jobId: string): Promise<JobIndex> {
  const updatedJob = await updateJob(jobId, (job) => {
    const pausedStages = job.stages.filter(
      (stage) => stage.status === JobStageStatus.enum.paused && stage.kind === "ai",
    );

    if (pausedStages.length === 0) {
      if (job.status === JobStatus.enum.running) {
        return job;
      }

      throw new Error("Only paused AI jobs can be resumed.");
    }

    return JobIndex.parse({
      ...job,
      pausedAt: null,
      stages: job.stages.map((stage) =>
        stage.status === JobStageStatus.enum.paused
          ? {
              ...stage,
              status: JobStageStatus.enum.running,
              updatedAt: now(),
              message: stage.message === "Processing paused." ? "Resuming processing." : stage.message,
            }
          : stage,
      ),
    });
  });

  await appendJobLog(jobId, "info", updatedJob.currentStage, "Job resumed.");
  return updatedJob;
}

export async function listJobs(
  page: number,
  pageSize: number,
  filter: "active" | "archived" | "all" = "active",
): Promise<JobListResponse> {
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
    .filter((job) => {
      if (filter === "all") {
        return true;
      }
      if (filter === "archived") {
        return Boolean(job.archivedAt);
      }
      return !job.archivedAt;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const start = (page - 1) * pageSize;
  return JobListResponse.parse({
    page,
    pageSize,
    total: items.length,
    items: items.slice(start, start + pageSize),
  });
}
