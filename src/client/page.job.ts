import { css, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { parseRouteParams } from "../shared/util.route-params.js";
import { getJobService } from "../shared/service.get-job.js";
import { streamJobService } from "../shared/service.stream-job.js";
import { JobDetail, JobStage } from "../shared/type.job.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { detailsIcon, leftArrowIcon } from "./icons.js";
import { sendJobToContentfulService } from "../shared/service.send-job-to-contentful.js";
import { dispatch } from "./util.events.js";
import { SuccessEvent } from "./event.success.js";
import { WarningEvent } from "./event.warning.js";

@customElement("rpg-chronicler-job-page")
export class RpgChroniclerJobPage extends RpgChroniclerAppProvider {
  private params = parseRouteParams("/jobs/:jobId", window.location.pathname);
  @state() private job: JobDetail | null = null;
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
        background:
          radial-gradient(circle at top right, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 36%),
          linear-gradient(180deg, color-mix(in srgb, var(--color-secondary-surface) 97%, white), var(--color-secondary-surface));
        border-radius: 32px;
        padding: var(--size-large);
        box-shadow: var(--shadow-hover);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
      }

      .hero-grid,
      .stage-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: var(--size-large);
      }

      .metric {
        display: grid;
        gap: var(--size-small);
      }

      .stage-card {
        background: color-mix(in srgb, var(--color-secondary-surface) 88%, black);
        border-radius: 26px;
        padding: var(--size-medium);
        display: grid;
        gap: var(--size-medium);
        box-shadow: var(--shadow-normal);
      }

      .version-actions {
        display: flex;
        gap: var(--size-small);
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
      }

      button {
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-radius: 999px;
        padding: var(--size-small) var(--size-medium);
        cursor: pointer;
        background: color-mix(in srgb, var(--color-primary-background) 68%, transparent);
        color: var(--color-primary-text);
        box-shadow: var(--shadow-normal);
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

      .status-pill {
        display: inline-flex;
        align-items: center;
        padding: 0.35rem 0.8rem;
        border-radius: 999px;
        font-size: var(--font-small);
      }

      .status-pill.running,
      .stage-card.running .stage-status {
        background: color-mix(in srgb, var(--color-accent) 24%, transparent);
        color: var(--color-accent);
      }

      .status-pill.completed,
      .stage-card.completed .stage-status {
        background: color-mix(in srgb, var(--color-success) 22%, transparent);
        color: var(--color-success);
      }

      .status-pill.failed,
      .stage-card.failed .stage-status {
        background: color-mix(in srgb, var(--color-error) 22%, transparent);
        color: #ff9797;
      }

      .status-pill.queued,
      .stage-card.pending .stage-status {
        background: color-mix(in srgb, var(--color-warning) 20%, transparent);
        color: var(--color-warning);
      }

      .stage-status {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        padding: 0.35rem 0.8rem;
        border-radius: 999px;
      }

      .stage-link {
        color: inherit;
        text-decoration: none;
      }

      .stage-link:hover {
        text-decoration: underline;
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
          <div class="version-actions">
            <a href="/jobs">${leftArrowIcon} Jobs</a>
            <a href=${`/jobs/${this.params.jobId}/logs`}>Logs ${detailsIcon}</a>
          </div>
          <h1>${this.job.file}</h1>
          <div class="hero-grid">
            <div class="metric"><span>Status</span><strong class=${`status-pill ${this.job.status}`}>${this.job.status}</strong></div>
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
          <h2>Contentful</h2>
          ${this.renderContentful()}
        </section>
      </main>
    `;
  }

  private renderStage(stage: JobStage): TemplateResult {
    return html`
      <article class=${`stage-card ${stage.status}`}>
        <div>
          <strong><a class="stage-link" href=${this.renderStagePath(stage.name)}>${stage.label}</a></strong>
        </div>
        <div class="stage-status">${stage.status}</div>
        <div class="progress"><div class="progress-bar" style=${`width:${stage.progress}%`}></div></div>
        <div>${stage.progress}%</div>
        ${stage.message ? html`<div>${stage.message}</div>` : html``}
      </article>
    `;
  }

  private renderStagePath(stageName: JobStage["name"]): string {
    return `/jobs/${this.params.jobId}/stage/${stageName.replace(/_/g, "-")}`;
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