import { css, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { parseRouteParams } from "../shared/util.route-params.js";
import { getJobService } from "../shared/service.get-job.js";
import { streamJobService } from "../shared/service.stream-job.js";
import {
  ArtifactDetail,
  ArtifactKey,
  ArtifactSummary,
  ArtifactVersion,
  JobDetail,
  JobLogEntry,
  JobStage,
  JobStageName,
} from "../shared/type.job.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { copyIcon, detailsIcon, leftArrowIcon, refreshIcon, rightArrowIcon } from "./icons.js";
import { updateArtifactService } from "../shared/service.update-artifact.js";
import { activateArtifactVersionService } from "../shared/service.activate-artifact-version.js";
import { deleteArtifactVersionService } from "../shared/service.delete-artifact-version.js";
import { dispatch } from "./util.events.js";
import { SuccessEvent } from "./event.success.js";
import { WarningEvent } from "./event.warning.js";

const STAGE_ARTIFACT_MAP: Partial<Record<JobStageName, ArtifactKey>> = {
  bullet_points: "bulletPoints",
  play_by_play: "playByPlay",
  dm_notes: "dmNotes",
  summary: "summary",
  story: "story",
  title: "title",
  image_prompt: "imagePrompt",
  lyrics: "lyrics",
  song_prompt: "songPrompt",
};

@customElement("rpg-chronicler-job-stage-page")
export class RpgChroniclerJobStagePage extends RpgChroniclerAppProvider {
  private params = parseRouteParams("/jobs/:jobId/stage/:stageSlug", window.location.pathname);
  @state() private job: JobDetail | null = null;
  @state() private editors: Record<string, string> = {};
  @state() private copyState: "idle" | "copied" | "error" = "idle";
  private eventSource: EventSource | null = null;

  static override styles = [
    globalStyles,
    css`
      main {
        padding: var(--size-large);
        display: grid;
        gap: var(--size-large);
      }

      .hero,
      .panel,
      .editor-shell,
      .version-item,
      .log-item {
        background:
          radial-gradient(
            circle at top right,
            color-mix(in srgb, var(--color-accent) 14%, transparent),
            transparent 36%
          ),
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--color-secondary-surface) 97%, white),
            var(--color-secondary-surface)
          );
        border-radius: 32px;
        padding: var(--size-large);
        box-shadow: var(--shadow-hover);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
      }

      .hero-top,
      .version-actions,
      .editor-actions,
      .editor-meta,
      .section-title,
      .version-header,
      .log-top,
      .stage-jump {
        display: flex;
        justify-content: space-between;
        gap: var(--size-small);
        flex-wrap: wrap;
        align-items: center;
      }

      .hero-grid,
      .stage-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--size-medium);
      }

      .metric,
      .metric-stack,
      .version-list,
      .log-list,
      .editor-panel,
      .empty-state {
        display: grid;
        gap: var(--size-small);
      }

      .editor-shell {
        padding: var(--size-medium);
      }

      .editor-shell textarea {
        min-height: 50vh;
        width: 100%;
        resize: vertical;
        box-sizing: border-box;
        background: transparent;
        color: var(--color-primary-text);
        border: none;
        border-radius: 22px;
        padding: var(--size-medium);
        font: inherit;
        line-height: 1.6;
        outline: none !important;
      }

      button,
      .link-chip {
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-radius: 999px;
        padding: var(--size-small) var(--size-medium);
        cursor: pointer;
        background: color-mix(in srgb, var(--color-primary-background) 68%, transparent);
        color: var(--color-primary-text);
        box-shadow: var(--shadow-normal);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
      }

      .secondary {
        background: color-mix(in srgb, var(--color-primary-text) 10%, transparent);
      }

      .danger {
        background: var(--color-error);
      }

      .pill,
      .status-pill,
      .level {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border-radius: 999px;
        padding: 0.3rem 0.7rem;
        font-size: var(--font-small);
        width: fit-content;
      }

      .pill {
        background: color-mix(in srgb, var(--color-primary-text) 10%, transparent);
      }

      .status-pill.running {
        background: color-mix(in srgb, var(--color-accent) 24%, transparent);
        color: var(--color-accent);
      }

      .status-pill.completed {
        background: color-mix(in srgb, var(--color-success) 22%, transparent);
        color: var(--color-success);
      }

      .status-pill.failed {
        background: color-mix(in srgb, var(--color-error) 22%, transparent);
        color: #ff9797;
      }

      .status-pill.pending {
        background: color-mix(in srgb, var(--color-warning) 20%, transparent);
        color: var(--color-warning);
      }

      .progress {
        width: 100%;
        height: 10px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        overflow: hidden;
      }

      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 75%, white), var(--color-2));
      }

      .version-list,
      .log-list {
        gap: var(--size-large);
      }

      .version-item,
      .log-item {
        padding: var(--size-medium);
      }

      .version-text,
      .log-message,
      .stage-message {
        white-space: pre-wrap;
      }

      .level.info {
        background: color-mix(in srgb, var(--color-accent) 22%, transparent);
        color: var(--color-accent);
      }

      .level.success {
        background: color-mix(in srgb, var(--color-success) 22%, transparent);
        color: var(--color-success);
      }

      .level.warning {
        background: color-mix(in srgb, var(--color-warning) 28%, transparent);
        color: var(--color-warning);
      }

      .level.error {
        background: color-mix(in srgb, var(--color-error) 20%, transparent);
        color: #ff8f8f;
      }

      .icon-button {
        padding-inline: 0.8rem;
      }

      .icon-button svg {
        width: 18px;
        height: 18px;
      }
    `,
  ];

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.eventSource?.close();
    this.eventSource = null;
  }

  override async load(): Promise<void> {
    await super.load();
    this.job = await getJobService.fetch({ jobId: this.params.jobId });
    this.openStream();
  }

  override render(): TemplateResult {
    if (!this.job) {
      return html`
        <main><p>Loading stage...</p></main>
      `;
    }

    const stageName = this.resolveStageName();
    if (!stageName) {
      return html`
        <main>
          <section class="panel empty-state">
            <a href=${`/jobs/${this.params.jobId}`}>${leftArrowIcon} Back to job</a>
            <h1>Stage not found</h1>
            <p>The requested stage slug does not map to a known processing stage.</p>
          </section>
        </main>
      `;
    }

    const stage = this.job.stages.find((item) => item.name === stageName) ?? null;
    const artifactKey = STAGE_ARTIFACT_MAP[stageName] ?? null;
    const artifact = artifactKey ? (this.job.artifacts.find((item) => item.key === artifactKey) ?? null) : null;
    const logs = this.job.logs.filter((entry) => entry.stage === stageName);
    const stageIndex = this.job.stages.findIndex((item) => item.name === stageName);
    const previousStage = stageIndex > 0 ? this.job.stages[stageIndex - 1] : null;
    const nextStage =
      stageIndex >= 0 && stageIndex < this.job.stages.length - 1 ? this.job.stages[stageIndex + 1] : null;

    return html`
      <main>
        <section class="hero">
          <div class="hero-top">
            <a class="link-chip" href=${`/jobs/${this.params.jobId}`}>${leftArrowIcon} Job overview</a>
            <div class="stage-jump">
              ${previousStage
                ? html`
                    <a class="link-chip" href=${this.renderStagePath(previousStage.name)}>
                      ${leftArrowIcon} ${previousStage.label}
                    </a>
                  `
                : html``}
              <a class="link-chip" href=${`/jobs/${this.params.jobId}/logs`}>Logs ${detailsIcon}</a>
              ${nextStage
                ? html`
                    <a class="link-chip" href=${this.renderStagePath(nextStage.name)}>
                      ${nextStage.label} ${rightArrowIcon}
                    </a>
                  `
                : html``}
            </div>
          </div>
          <h1>${stage?.label ?? this.params.stageSlug}</h1>
          <div class="hero-grid">
            <div class="metric">
              <span>Status</span>
              <strong class=${`status-pill ${stage?.status ?? "pending"}`}>${stage?.status ?? "pending"}</strong>
            </div>
            <div class="metric">
              <span>Progress</span>
              <strong>${stage?.progress ?? 0}%</strong>
            </div>
            <div class="metric">
              <span>Versions</span>
              <strong>${artifact?.versionCount ?? 0}</strong>
            </div>
            <div class="metric">
              <span>Last update</span>
              <strong>${stage ? new Date(stage.updatedAt).toLocaleString() : "Unknown"}</strong>
            </div>
          </div>
          ${stage?.message
            ? html`
                <p class="stage-message">${stage.message}</p>
              `
            : html``}
        </section>

        ${artifact ? this.renderArtifactEditor(artifact) : this.renderStageOverview(stage, logs)}
        ${artifact ? this.renderVersions(artifact) : html``}

        <section>
          <div class="section-title">
            <h2>Stage activity</h2>
            <span class="pill">${logs.length} entries</span>
          </div>
          <div class="log-list">
            ${logs.length === 0
              ? html`
                  <p>No stage-specific logs yet.</p>
                `
              : logs.map((entry) => this.renderLog(entry))}
          </div>
        </section>
      </main>
    `;
  }

  private renderArtifactEditor(artifact: ArtifactSummary): TemplateResult {
    const activeVersion = this.resolveActiveVersion(artifact);
    const editorValue = this.editors[artifact.key] ?? activeVersion?.text ?? "";
    const words = this.countWords(editorValue);
    const chars = editorValue.length;

    return html`
      <section class="editor-panel">
        <div class="section-title">
          <div class="metric-stack">
            <h2>${artifact.label}</h2>
            <div class="editor-meta">
              <span class="pill">Words ${words}</span>
              <span class="pill">Characters ${chars}</span>
              ${activeVersion
                ? html`
                    <span class="pill">Active ${activeVersion.source}</span>
                  `
                : html``}
              ${artifact.generatedVersionId && artifact.generatedVersionId === activeVersion?.id
                ? html`
                    <span class="pill">Generated</span>
                  `
                : html``}
            </div>
          </div>
          <div class="editor-actions">
            <button
              class="secondary icon-button"
              @click=${() => this.handleCopy(editorValue)}
              title="Copy current editor text">
              ${copyIcon} ${this.copyState === "copied" ? "Copied" : "Copy"}
            </button>
            <button class="secondary" ?disabled=${!activeVersion} @click=${() => this.handleResetEditor(artifact)}>
              ${refreshIcon} Reset to active
            </button>
            <button @click=${() => this.handleArtifactSave(artifact)}>Save new version</button>
          </div>
        </div>

        <div class="editor-shell">
          <textarea
            .value=${editorValue}
            @input=${(event: Event) => this.handleEditorInput(artifact.key, event)}></textarea>
        </div>
      </section>
    `;
  }

  private renderStageOverview(stage: JobStage | null, logs: JobLogEntry[]): TemplateResult {
    return html`
      <section class="panel empty-state">
        <h2>No editable artifact for this stage</h2>
        <p>This stage tracks workflow status and logs but does not own a text artifact version history.</p>
        ${stage?.message
          ? html`
              <div class="pill">Latest note: ${stage.message}</div>
            `
          : html``}
        ${logs.length > 0
          ? html`
              <div class="pill">Recent log: ${logs[logs.length - 1]?.message}</div>
            `
          : html``}
      </section>
    `;
  }

  private renderVersions(artifact: ArtifactSummary): TemplateResult {
    const versions = this.job?.artifactVersions[artifact.key] ?? [];
    return html`
      <section class="">
        <div class="section-title">
          <h2>Version history</h2>
          <span class="pill">${versions.length} versions</span>
        </div>
        <div class="version-list">
          ${versions.length === 0
            ? html`
                <p>No saved versions yet.</p>
              `
            : versions.map((version) => this.renderVersion(artifact, version))}
        </div>
      </section>
    `;
  }

  private renderVersion(artifact: ArtifactSummary, version: ArtifactVersion): TemplateResult {
    const isActive = artifact.activeVersionId === version.id;
    const isDeleted = Boolean(version.deletedAt);
    const isGenerated = artifact.generatedVersionId === version.id;

    return html`
      <article class="version-item">
        <div class="version-header">
          <div class="editor-meta">
            <span class="pill">${version.source}</span>
            ${isGenerated
              ? html`
                  <span class="pill">Generated</span>
                `
              : html``}
            ${isActive
              ? html`
                  <span class="pill">Active</span>
                `
              : html``}
            ${isDeleted
              ? html`
                  <span class="pill">Deleted</span>
                `
              : html``}
          </div>
          <small>${new Date(version.createdAt).toLocaleString()}</small>
        </div>
        <div class="version-text">${version.text}</div>
        <div class="version-actions">
          <button class="secondary icon-button" @click=${() => this.handleCopy(version.text)} title="Copy this version">
            ${copyIcon}
          </button>
          <div class="editor-actions">
            <button class="secondary" ?disabled=${isDeleted} @click=${() => this.handleLoadVersion(artifact, version)}>
              Load into editor
            </button>
            <button
              class="secondary"
              ?disabled=${isActive || isDeleted}
              @click=${() => this.handleActivateVersion(artifact, version)}>
              Make active
            </button>
            <button class="danger" ?disabled=${isDeleted} @click=${() => this.handleDeleteVersion(artifact, version)}>
              Delete version
            </button>
          </div>
        </div>
      </article>
    `;
  }

  private renderLog(entry: JobLogEntry): TemplateResult {
    return html`
      <article class="log-item">
        <div class="log-top">
          <span class=${`level ${entry.level}`}>${entry.level}</span>
          <small>${new Date(entry.createdAt).toLocaleString()}</small>
        </div>
        <div class="log-message">${entry.message}</div>
      </article>
    `;
  }

  private resolveStageName(): JobStageName | null {
    const normalized = this.params.stageSlug.replace(/-/g, "_");
    const parsed = JobStageName.safeParse(normalized);
    return parsed.success ? parsed.data : null;
  }

  private renderStagePath(stageName: JobStageName): string {
    return `/jobs/${this.params.jobId}/stage/${stageName.replace(/_/g, "-")}`;
  }

  private resolveActiveVersion(artifact: ArtifactSummary): ArtifactVersion | null {
    const versions = this.job?.artifactVersions[artifact.key] ?? [];
    return versions.find((version) => version.id === artifact.activeVersionId) ?? null;
  }

  private countWords(text: string): number {
    const normalized = text.trim();
    return normalized ? normalized.split(/\s+/).length : 0;
  }

  private handleEditorInput(artifactKey: string, event: Event): void {
    const target = event.currentTarget as HTMLTextAreaElement;
    this.editors = {
      ...this.editors,
      [artifactKey]: target.value,
    };
  }

  private handleResetEditor(artifact: ArtifactSummary): void {
    this.editors = {
      ...this.editors,
      [artifact.key]: this.resolveActiveVersion(artifact)?.text ?? "",
    };
  }

  private handleLoadVersion(artifact: ArtifactSummary, version: ArtifactVersion): void {
    this.editors = {
      ...this.editors,
      [artifact.key]: version.text,
    };
    dispatch(this, SuccessEvent(`${artifact.label} version loaded into the editor.`));
  }

  private async handleCopy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copyState = "copied";
      dispatch(this, SuccessEvent("Copied to clipboard."));
    } catch {
      this.copyState = "error";
      dispatch(this, WarningEvent("Unable to copy to clipboard."));
    }
  }

  private async handleArtifactSave(artifact: ArtifactSummary): Promise<void> {
    const text = this.editors[artifact.key] ?? this.resolveActiveVersion(artifact)?.text ?? "";
    if (text.trim().length === 0) {
      dispatch(this, WarningEvent("Artifact text cannot be empty."));
      return;
    }

    try {
      const detail = await updateArtifactService.fetch({
        jobId: this.params.jobId,
        artifactKey: artifact.key,
        text,
      });
      this.applyArtifactDetail(detail);
      this.editors = {
        ...this.editors,
        [artifact.key]: detail.activeVersion?.text ?? text,
      };
      dispatch(this, SuccessEvent(`${artifact.label} saved as a new version.`));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to save artifact."));
    }
  }

  private async handleActivateVersion(artifact: ArtifactSummary, version: ArtifactVersion): Promise<void> {
    try {
      const detail = await activateArtifactVersionService.fetch({
        jobId: this.params.jobId,
        artifactKey: artifact.key,
        versionId: version.id,
      });
      this.applyArtifactDetail(detail);
      this.editors = {
        ...this.editors,
        [artifact.key]: detail.activeVersion?.text ?? "",
      };
      dispatch(this, SuccessEvent(`${artifact.label} reverted to a previous version.`));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to activate version."));
    }
  }

  private async handleDeleteVersion(artifact: ArtifactSummary, version: ArtifactVersion): Promise<void> {
    try {
      const detail = await deleteArtifactVersionService.fetch({
        jobId: this.params.jobId,
        artifactKey: artifact.key,
        versionId: version.id,
      });
      this.applyArtifactDetail(detail);
      dispatch(this, SuccessEvent(`${artifact.label} version deleted.`));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to delete version."));
    }
  }

  private applyArtifactDetail(detail: ArtifactDetail): void {
    if (!this.job) {
      return;
    }

    this.job = JobDetail.parse({
      ...this.job,
      artifacts: this.job.artifacts.map((artifact) =>
        artifact.key === detail.key
          ? {
              key: detail.key,
              label: detail.label,
              activeVersionId: detail.activeVersionId,
              generatedVersionId: detail.generatedVersionId,
              versionCount: detail.versionCount,
              updatedAt: detail.updatedAt,
            }
          : artifact,
      ),
      artifactVersions: {
        ...this.job.artifactVersions,
        [detail.key]: detail.versions,
      },
      contentful: {
        ...this.job.contentful,
        title: detail.key === "title" ? (detail.activeVersion?.text ?? null) : this.job.contentful.title,
        summary: detail.key === "summary" ? (detail.activeVersion?.text ?? null) : this.job.contentful.summary,
        story: detail.key === "story" ? (detail.activeVersion?.text ?? null) : this.job.contentful.story,
        dmNotes: detail.key === "dmNotes" ? (detail.activeVersion?.text ?? null) : this.job.contentful.dmNotes,
      },
    });
  }

  private openStream(): void {
    if (this.eventSource) {
      return;
    }

    this.eventSource = new EventSource(streamJobService.renderPath({ jobId: this.params.jobId }));
    this.eventSource.addEventListener("job", (event) => {
      const message = event as MessageEvent<string>;
      this.job = JobDetail.parse(JSON.parse(message.data));
    });
  }
}
