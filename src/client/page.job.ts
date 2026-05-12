import { css, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { parseRouteParams } from "../shared/util.route-params.js";
import { getJobService } from "../shared/service.get-job.js";
import { streamJobService } from "../shared/service.stream-job.js";
import {
  ArtifactDetail,
  ArtifactSummary,
  ArtifactVersion,
  JobDetail,
  JobStage,
} from "../shared/type.job.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { leftArrowIcon } from "./icons.js";
import { updateArtifactService } from "../shared/service.update-artifact.js";
import { activateArtifactVersionService } from "../shared/service.activate-artifact-version.js";
import { deleteArtifactVersionService } from "../shared/service.delete-artifact-version.js";
import { sendJobToContentfulService } from "../shared/service.send-job-to-contentful.js";
import { dispatch } from "./util.events.js";
import { SuccessEvent } from "./event.success.js";
import { WarningEvent } from "./event.warning.js";

@customElement("rpg-chronicler-job-page")
export class RpgChroniclerJobPage extends RpgChroniclerAppProvider {
  private params = parseRouteParams("/jobs/:jobId", window.location.pathname);
  @state() private job: JobDetail | null = null;
  @state() private editors: Record<string, string> = {};
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
      .panel {
        background: var(--color-secondary-surface);
        border-radius: var(--radius-large);
        padding: var(--size-large);
        box-shadow: var(--shadow-passive);
      }

      .hero-grid,
      .stage-grid,
      .artifact-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: var(--size-large);
      }

      .metric {
        display: grid;
        gap: var(--size-small);
      }

      .stage-card,
      .artifact-card {
        background: color-mix(in srgb, var(--color-secondary-surface) 82%, black);
        border-radius: var(--radius-medium);
        padding: var(--size-medium);
        display: grid;
        gap: var(--size-medium);
      }

      .artifact-actions,
      .version-actions,
      .version-header {
        display: flex;
        gap: var(--size-small);
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
      }

      textarea {
        min-height: 160px;
        width: 100%;
        background: color-mix(in srgb, var(--color-primary-background) 70%, black);
        color: var(--color-primary-text);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 18%, transparent);
        border-radius: var(--radius-medium);
        padding: var(--size-medium);
        font: inherit;
      }

      button {
        border: none;
        border-radius: var(--radius-medium);
        padding: var(--size-small) var(--size-medium);
        cursor: pointer;
        background: linear-gradient(135deg, var(--color-1), var(--color-2));
        color: var(--color-primary-text);
      }

      .secondary {
        background: color-mix(in srgb, var(--color-primary-text) 10%, transparent);
      }

      .danger {
        background: var(--color-error);
      }

      .version-list {
        display: grid;
        gap: var(--size-small);
      }

      .version-item {
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-radius: var(--radius-medium);
        padding: var(--size-medium);
        display: grid;
        gap: var(--size-small);
      }

      .contentful-preview {
        display: grid;
        gap: var(--size-medium);
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        border-radius: 999px;
        padding: 0.2rem 0.6rem;
        font-size: var(--font-small);
        background: color-mix(in srgb, var(--color-primary-text) 10%, transparent);
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
        background: linear-gradient(90deg, var(--color-1), var(--color-2));
      }

      pre {
        white-space: pre-wrap;
        font-family: inherit;
        margin: 0;
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
      return html`<main><p>Loading job...</p></main>`;
    }

    return html`
      <main>
        <section class="hero">
          <a href="/jobs">${leftArrowIcon} Jobs</a>
          <h1>${this.job.file}</h1>
          <div class="hero-grid">
            <div class="metric"><span>Status</span><strong>${this.job.status}</strong></div>
            <div class="metric"><span>Progress</span><strong>${this.job.totalProgress}%</strong></div>
            <div class="metric"><span>Current stage</span><strong>${this.job.currentStage ?? "complete"}</strong></div>
            <div class="metric"><span>Artifacts</span><strong>${this.job.artifacts.filter((artifact) => artifact.versionCount > 0).length}</strong></div>
          </div>
        </section>

        <section class="panel">
          <h2>Stages</h2>
          <div class="stage-grid">
            ${this.job.stages.map((stage) => this.renderStage(stage))}
          </div>
        </section>

        <section class="panel">
          <h2>Artifacts</h2>
          <div class="artifact-grid">
            ${this.job.artifacts.map((artifact) => this.renderArtifact(artifact))}
          </div>
        </section>

        <section class="panel">
          <h2>Contentful</h2>
          ${this.renderContentful()}
        </section>
      </main>
    `;
  }

  private renderStage(stage: JobStage): TemplateResult {
    return html`
      <article class="stage-card">
        <div><strong>${stage.label}</strong></div>
        <div>${stage.status}</div>
        <div class="progress"><div class="progress-bar" style=${`width:${stage.progress}%`}></div></div>
        <div>${stage.progress}%</div>
        ${stage.message ? html`<div>${stage.message}</div>` : html``}
      </article>
    `;
  }

  private renderArtifact(artifact: ArtifactSummary): TemplateResult {
    const activeVersion = this.resolveActiveVersion(artifact);
    const versions = this.job?.artifactVersions[artifact.key] ?? [];
    const editorValue = this.editors[artifact.key] ?? activeVersion?.text ?? "";
    return html`
      <article class="artifact-card">
        <div class="version-header">
          <strong>${artifact.label}</strong>
          <span>Versions: ${artifact.versionCount}</span>
        </div>
        ${activeVersion
          ? html`
              <div class="artifact-actions">
                <span class="pill">Active ${activeVersion.source}</span>
                ${artifact.generatedVersionId === activeVersion.id ? html`<span class="pill">Generated</span>` : html``}
              </div>
              <pre>${activeVersion.text}</pre>
            `
          : html`<div>Not generated yet.</div>`}

        <label>
          <div>Edit active text</div>
          <textarea .value=${editorValue} @input=${(event: Event) => this.handleEditorInput(artifact.key, event)}></textarea>
        </label>
        <div class="artifact-actions">
          <button @click=${() => this.handleArtifactSave(artifact)}>Save new version</button>
        </div>

        <div class="version-list">
          ${versions.map((version) => this.renderVersion(artifact, version))}
        </div>
      </article>
    `;
  }

  private renderVersion(artifact: ArtifactSummary, version: ArtifactVersion): TemplateResult {
    const isActive = artifact.activeVersionId === version.id;
    const isDeleted = Boolean(version.deletedAt);
    const isGenerated = artifact.generatedVersionId === version.id;

    return html`
      <div class="version-item">
        <div class="version-header">
          <div class="artifact-actions">
            <span class="pill">${version.source}</span>
            ${isGenerated ? html`<span class="pill">Generated</span>` : html``}
            ${isActive ? html`<span class="pill">Active</span>` : html``}
            ${isDeleted ? html`<span class="pill">Deleted</span>` : html``}
          </div>
          <small>${new Date(version.createdAt).toLocaleString()}</small>
        </div>
        <pre>${version.text}</pre>
        <div class="version-actions">
          <button class="secondary" ?disabled=${isActive || isDeleted} @click=${() => this.handleActivateVersion(artifact, version)}>
            Make active
          </button>
          <button class="danger" ?disabled=${isDeleted} @click=${() => this.handleDeleteVersion(artifact, version)}>
            Delete version
          </button>
        </div>
      </div>
    `;
  }

  private resolveActiveVersion(artifact: ArtifactSummary): ArtifactVersion | null {
    const versions = this.job?.artifactVersions[artifact.key] ?? [];
    return versions.find((version) => version.id === artifact.activeVersionId) ?? null;
  }

  private handleEditorInput(artifactKey: string, event: Event): void {
    const target = event.currentTarget as HTMLTextAreaElement;
    this.editors = {
      ...this.editors,
      [artifactKey]: target.value,
    };
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
        title: detail.key === "title" ? detail.activeVersion?.text ?? null : this.job.contentful.title,
        summary: detail.key === "summary" ? detail.activeVersion?.text ?? null : this.job.contentful.summary,
        story: detail.key === "story" ? detail.activeVersion?.text ?? null : this.job.contentful.story,
        dmNotes: detail.key === "dmNotes" ? detail.activeVersion?.text ?? null : this.job.contentful.dmNotes,
      },
    });
  }

  private renderContentful(): TemplateResult {
    if (!this.job) {
      return html``;
    }

    const contentful = this.job.contentful;
    const readyToSend = Boolean(contentful.title && contentful.summary && contentful.story && contentful.dmNotes);

    if (contentful.entryUrl) {
      return html`
        <div class="contentful-preview">
          <div><strong>${contentful.title}</strong></div>
          <pre>${contentful.summary}</pre>
          <div>Sent ${contentful.sentAt ? new Date(contentful.sentAt).toLocaleString() : "recently"}</div>
          <a href=${contentful.entryUrl} target="_blank" rel="noreferrer">Open Contentful entry</a>
        </div>
      `;
    }

    return html`
      <div class="contentful-preview">
        <div><strong>Preview title</strong></div>
        <pre>${contentful.title ?? "Title not ready"}</pre>
        <div><strong>Preview summary</strong></div>
        <pre>${contentful.summary ?? "Summary not ready"}</pre>
        <div><strong>Preview story</strong></div>
        <pre>${contentful.story ?? "Story not ready"}</pre>
        <div><strong>Preview DM notes</strong></div>
        <pre>${contentful.dmNotes ?? "DM notes not ready"}</pre>
        <div>
          <button ?disabled=${!readyToSend || contentful.status === "sending"} @click=${this.handleSendToContentful}>
            ${contentful.status === "sending" ? "Sending..." : "Approve and send to Contentful"}
          </button>
        </div>
      </div>
    `;
  }

  private async handleSendToContentful(): Promise<void> {
    try {
      this.job = await sendJobToContentfulService.fetch({ jobId: this.params.jobId });
      dispatch(this, SuccessEvent("Job sent to Contentful."));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to send job to Contentful."));
    }
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