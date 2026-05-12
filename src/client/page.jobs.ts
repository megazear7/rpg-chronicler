import { css, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { listJobsService } from "../shared/service.list-jobs.js";
import { streamJobsService } from "../shared/service.stream-jobs.js";
import { JobIndex, JobListResponse } from "../shared/type.job.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { leftArrowIcon, rightArrowIcon } from "./icons.js";

@customElement("rpg-chronicler-jobs-page")
export class RpgChroniclerJobsPage extends RpgChroniclerAppProvider {
  @state() private jobs: JobListResponse | null = null;
  private eventSource: EventSource | null = null;

  static override styles = [
    globalStyles,
    css`
      main {
        padding: var(--size-large);
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
        background: var(--color-secondary-surface);
        border-radius: var(--radius-large);
        padding: var(--size-large);
        box-shadow: var(--shadow-passive);
        display: grid;
        gap: var(--size-medium);
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
        background: linear-gradient(90deg, var(--color-1), var(--color-2));
      }

      .empty {
        margin-top: var(--size-large);
        padding: var(--size-large);
        background: var(--color-secondary-surface);
        border-radius: var(--radius-large);
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
          ? html`<div class="empty">No jobs have been created yet.</div>`
          : html`
              <section class="grid">
                ${this.jobs.items.map((job) => this.renderJob(job))}
              </section>
            `}
      </main>
    `;
  }

  private renderJob(job: JobIndex): TemplateResult {
    return html`
      <article class="job-card">
        <div>
          <div class="stage-row"><strong>${job.file}</strong><span>${job.status}</span></div>
          <div class="status-row"><span>Current stage</span><span>${job.currentStage ?? "complete"}</span></div>
        </div>
        <div class="progress"><div class="progress-bar" style=${`width:${job.totalProgress}%`}></div></div>
        <div class="status-row"><span>Total progress</span><span>${job.totalProgress}%</span></div>
        <a href=${`/jobs/${job.id}`}>Open job ${rightArrowIcon}</a>
      </article>
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