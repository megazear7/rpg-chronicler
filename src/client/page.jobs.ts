import { css, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { listJobsService } from "../shared/service.list-jobs.js";
import { streamJobsService } from "../shared/service.stream-jobs.js";
import { JobIndex, JobListResponse } from "../shared/type.job.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { leftArrowIcon } from "./icons.js";

@customElement("rpg-chronicler-jobs-page")
export class RpgChroniclerJobsPage extends RpgChroniclerAppProvider {
  @state() private jobs: JobListResponse | null = null;
  private eventSource: EventSource | null = null;

  static override styles = [
    globalStyles,
    css`
      main {
        padding: var(--size-large);
        display: grid;
        gap: var(--size-large);
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: var(--size-large);
        flex-wrap: wrap;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: var(--size-large);
        margin-top: var(--size-large);
      }

      .job-card {
        background:
          radial-gradient(
            circle at top right,
            color-mix(in srgb, var(--color-accent) 16%, transparent),
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
        display: grid;
        gap: var(--size-medium);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
        color: var(--color-primary-text);
        text-decoration: none;
        transition:
          transform 140ms ease,
          border-color 140ms ease,
          box-shadow 140ms ease;
      }

      .job-card:hover {
        color: var(--color-primary-text);
        box-shadow:
          var(--shadow-hover),
          0 0 0 1px color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-color: color-mix(in srgb, var(--color-accent) 36%, transparent);
      }

      .job-card:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 3px;
      }

      .status-row,
      .stage-row {
        display: flex;
        justify-content: space-between;
        gap: var(--size-medium);
        font-size: var(--font-small);
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

      .empty {
        margin-top: var(--size-large);
        padding: var(--size-large);
        background: var(--color-secondary-surface);
        border-radius: 32px;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        padding: 0.32rem 0.8rem;
        border-radius: 999px;
        font-size: var(--font-small);
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

      .status-pill.queued {
        background: color-mix(in srgb, var(--color-warning) 20%, transparent);
        color: var(--color-warning);
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
    this.jobs = await listJobsService.fetch({ page: "1", pageSize: "20" });
    this.openStream();
  }

  override render(): TemplateResult {
    return html`
      <main>
        <div class="header">
          <div>
            <a href="/">${leftArrowIcon} Home</a>
            <h1>Jobs</h1>
            <p>Live job list streamed from the server every second.</p>
          </div>
        </div>

        ${!this.jobs || this.jobs.items.length === 0
          ? html`
              <div class="empty">No jobs have been created yet.</div>
            `
          : html`
              <section class="grid">${this.jobs.items.map((job) => this.renderJob(job))}</section>
            `}
      </main>
    `;
  }

  private renderJob(job: JobIndex): TemplateResult {
    return html`
      <a class="job-card" href=${`/jobs/${job.id}`}>
        <div>
          <div class="stage-row">
            <strong>${job.file}</strong>
            <span class=${`status-pill ${job.status}`}>${job.status}</span>
          </div>
          <div class="status-row">
            <span>Current stage</span>
            <span>${job.currentStage ?? "complete"}</span>
          </div>
        </div>
        <div class="progress"><div class="progress-bar" style=${`width:${job.totalProgress}%`}></div></div>
        <div class="status-row">
          <span>Total progress</span>
          <span>${job.totalProgress}%</span>
        </div>
      </a>
    `;
  }

  private openStream(): void {
    if (this.eventSource) {
      return;
    }

    this.eventSource = new EventSource(streamJobsService.renderPath({ page: "1", pageSize: "20" }));
    this.eventSource.addEventListener("jobs", (event) => {
      const message = event as MessageEvent<string>;
      this.jobs = JobListResponse.parse(JSON.parse(message.data));
    });
  }
}
