import z from "zod";
import { ContentfulSubmissionSnapshot } from "./type.contentful-context.js";

export const JobStatus = z.enum(["queued", "running", "completed", "failed"]);
export type JobStatus = z.infer<typeof JobStatus>;

export const JobStageStatus = z.enum(["pending", "running", "completed", "failed"]);
export type JobStageStatus = z.infer<typeof JobStageStatus>;

export const JobStageKind = z.enum(["human", "ai"]);
export type JobStageKind = z.infer<typeof JobStageKind>;

export const JobStageName = z.enum([
  "upload",
  "configure_context",
  "prepare_audio",
  "bullet_points",
  "play_by_play",
  "dm_notes",
  "summary",
  "story",
  "title",
  "image_prompt",
  "image_generation",
  "image_approval",
  "lyrics",
  "song_prompt",
  "song_approval",
  "contentful",
  "notion",
]);
export type JobStageName = z.infer<typeof JobStageName>;

export const ArtifactKey = z.enum([
  "bulletPoints",
  "playByPlay",
  "dmNotes",
  "summary",
  "story",
  "title",
  "imagePrompt",
  "lyrics",
  "songPrompt",
]);
export type ArtifactKey = z.infer<typeof ArtifactKey>;

export const ArtifactVersionSource = z.enum(["generated", "edited"]);
export type ArtifactVersionSource = z.infer<typeof ArtifactVersionSource>;

export const ArtifactVersion = z.object({
  id: z.uuid(),
  createdAt: z.string().datetime(),
  source: ArtifactVersionSource,
  text: z.string(),
  deletedAt: z.string().datetime().nullable().optional(),
});
export type ArtifactVersion = z.infer<typeof ArtifactVersion>;

export const ArtifactSummary = z.object({
  key: ArtifactKey,
  label: z.string(),
  activeVersionId: z.uuid().nullable(),
  generatedVersionId: z.uuid().nullable(),
  versionCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime().nullable(),
});
export type ArtifactSummary = z.infer<typeof ArtifactSummary>;

export const ArtifactDetail = ArtifactSummary.extend({
  activeVersion: ArtifactVersion.nullable(),
  versions: z.array(ArtifactVersion),
});
export type ArtifactDetail = z.infer<typeof ArtifactDetail>;

export const JobStage = z.object({
  name: JobStageName,
  label: z.string(),
  kind: JobStageKind,
  status: JobStageStatus,
  progress: z.number().min(0).max(100),
  updatedAt: z.string().datetime(),
  message: z.string().optional(),
});
export type JobStage = z.infer<typeof JobStage>;

export const JobLogLevel = z.enum(["info", "success", "warning", "error"]);
export type JobLogLevel = z.infer<typeof JobLogLevel>;

export const JobLogEntry = z.object({
  id: z.uuid(),
  createdAt: z.string().datetime(),
  level: JobLogLevel,
  stage: JobStageName.nullable(),
  message: z.string(),
});
export type JobLogEntry = z.infer<typeof JobLogEntry>;

export const JobImageAsset = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  prompt: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  source: z.enum(["generated", "uploaded"]),
  approvedAt: z.string().datetime().nullable().optional(),
});
export type JobImageAsset = z.infer<typeof JobImageAsset>;

export const JobImageState = z.object({
  status: z.enum(["not_ready", "ready", "generating", "awaiting_approval", "approved"]),
  selectedAssetId: z.string().nullable(),
  generatedAssets: z.array(JobImageAsset),
  lastGeneratedAt: z.string().datetime().nullable(),
});
export type JobImageState = z.infer<typeof JobImageState>;

export const JobSongState = z.object({
  status: z.enum(["not_ready", "ready", "drafted", "awaiting_selection", "selected"]),
  provider: z.enum(["manual", "suno"]).default("manual"),
  externalSongId: z.string().nullable().optional(),
  songUrl: z.string().nullable(),
  selectedAt: z.string().datetime().nullable(),
});
export type JobSongState = z.infer<typeof JobSongState>;

export const JobNotionState = z.object({
  status: z.enum(["not_ready", "ready", "sending", "sent"]),
  pageId: z.string().nullable(),
  pageUrl: z.string().nullable(),
  sentAt: z.string().datetime().nullable(),
});
export type JobNotionState = z.infer<typeof JobNotionState>;

export const JobContentful = z.object({
  status: z.enum(["not_ready", "ready", "sending", "sent"]),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  story: z.string().nullable(),
  dmNotes: z.string().nullable(),
  entryId: z.string().nullable(),
  entryUrl: z.string().nullable(),
  sentAt: z.string().datetime().nullable(),
});
export type JobContentful = z.infer<typeof JobContentful>;

export const JobIndex = z.object({
  id: z.uuid(),
  file: z.string(),
  instructionsText: z.string().nullable().optional(),
  submission: ContentfulSubmissionSnapshot.nullable().optional(),
  status: JobStatus,
  totalProgress: z.number().min(0).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  currentStage: JobStageName.nullable(),
  errorMessage: z.string().nullable().optional(),
  stages: z.array(JobStage),
  artifacts: z.array(ArtifactSummary),
  image: JobImageState,
  song: JobSongState,
  contentful: JobContentful,
  notion: JobNotionState,
});
export type JobIndex = z.infer<typeof JobIndex>;

export const JobDetail = JobIndex.extend({
  artifactVersions: z.record(z.string(), z.array(ArtifactVersion)),
  logs: z.array(JobLogEntry),
});
export type JobDetail = z.infer<typeof JobDetail>;

export const JobListResponse = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  items: z.array(JobIndex),
});
export type JobListResponse = z.infer<typeof JobListResponse>;

export const jobStageLabels: Record<JobStageName, string> = {
  upload: "Upload",
  configure_context: "Configuration",
  prepare_audio: "Prepare audio",
  bullet_points: "Bullet points",
  play_by_play: "Play by play",
  dm_notes: "DM notes",
  summary: "Summary",
  story: "Story",
  title: "Title",
  image_prompt: "Image prompt",
  image_generation: "Image generation",
  image_approval: "Image approval",
  lyrics: "Lyrics",
  song_prompt: "Song prompt",
  song_approval: "Song approval",
  contentful: "Contentful",
  notion: "Notion",
};

export const jobStageKinds: Record<JobStageName, JobStageKind> = {
  upload: "human",
  configure_context: "human",
  prepare_audio: "ai",
  bullet_points: "ai",
  play_by_play: "ai",
  dm_notes: "ai",
  summary: "ai",
  story: "ai",
  title: "ai",
  image_prompt: "ai",
  image_generation: "ai",
  image_approval: "human",
  lyrics: "ai",
  song_prompt: "ai",
  song_approval: "human",
  contentful: "human",
  notion: "human",
};

export const artifactLabels: Record<ArtifactKey, string> = {
  bulletPoints: "Bullet points",
  playByPlay: "Play by play",
  dmNotes: "DM notes",
  summary: "Summary",
  story: "Story",
  title: "Title",
  imagePrompt: "Image prompt",
  lyrics: "Lyrics",
  songPrompt: "Song prompt",
};

export const jobStageOrder = JobStageName.options;
export const artifactOrder = ArtifactKey.options;
