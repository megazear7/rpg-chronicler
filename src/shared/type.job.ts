import z from "zod";

export const JobStatus = z.enum(["queued", "running", "completed", "failed"]);
export type JobStatus = z.infer<typeof JobStatus>;

export const JobStageStatus = z.enum(["pending", "running", "completed", "failed"]);
export type JobStageStatus = z.infer<typeof JobStageStatus>;

export const JobStageName = z.enum([
  "upload",
  "prepare_audio",
  "bullet_points",
  "play_by_play",
  "dm_notes",
  "summary",
  "story",
  "title",
  "image_prompt",
  "lyrics",
  "song_prompt",
  "contentful",
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
  status: JobStatus,
  totalProgress: z.number().min(0).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  currentStage: JobStageName.nullable(),
  errorMessage: z.string().nullable().optional(),
  stages: z.array(JobStage),
  artifacts: z.array(ArtifactSummary),
  contentful: JobContentful,
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
  prepare_audio: "Prepare audio",
  bullet_points: "Bullet points",
  play_by_play: "Play by play",
  dm_notes: "DM notes",
  summary: "Summary",
  story: "Story",
  title: "Title",
  image_prompt: "Image prompt",
  lyrics: "Lyrics",
  song_prompt: "Song prompt",
  contentful: "Contentful",
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