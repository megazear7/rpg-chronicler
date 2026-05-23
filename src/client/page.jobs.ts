import { css, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { archiveJobService } from "../shared/service.archive-job.js";
import { listJobsService } from "../shared/service.list-jobs.js";
import { restoreJobService } from "../shared/service.restore-job.js";
import { streamJobsService } from "../shared/service.stream-jobs.js";
import { JobIndex, JobListResponse } from "../shared/type.job.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { kebabIcon, leftArrowIcon } from "./icons.js";
import { SuccessEvent } from "./event.success.js";
import { WarningEvent } from "./event.warning.js";
import { dispatch } from "./util.events.js";

@customElement("rpg-chronicler-jobs-page")
export class RpgChroniclerJobsPage extends RpgChroniclerAppProvider {
  @state() private jobs: JobListResponse | null = null;
  @state() private filter: "active" | "archived" = "active";
  @state() private updatingJobId: string | null = null;
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
        transition:
          transform 140ms ease,
          border-color 140ms ease,
          box-shadow 140ms ease;
      }

      .job-card:hover {
        box-shadow:
          var(--shadow-hover),
          0 0 0 1px color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-color: color-mix(in srgb, var(--color-accent) 36%, transparent);
      }

      .job-card-top {
        display: flex;
        justify-content: space-between;
        gap: var(--size-small);
        align-items: start;
      }

      .job-card-link {
        display: grid;
        gap: var(--size-medium);
        color: var(--color-primary-text);
        text-decoration: none;
      }

      .job-card-link:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 3px;
        border-radius: 18px;
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

      .filter-actions {
        display: flex;
        gap: var(--size-small);
        flex-wrap: wrap;
      }

      .filter-actions button {
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-radius: 999px;
        padding: var(--size-small) var(--size-medium);
        background: color-mix(in srgb, var(--color-primary-background) 68%, transparent);
        color: var(--color-primary-text);
        cursor: pointer;
      }

      .filter-actions button.active {
        background: color-mix(in srgb, var(--color-accent) 22%, transparent);
        border-color: color-mix(in srgb, var(--color-accent) 48%, transparent);
        color: var(--color-accent);
      }

      .menu {
        position: relative;
      }

      .menu summary {
        list-style: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        background: color-mix(in srgb, var(--color-primary-background) 68%, transparent);
        cursor: pointer;
      }

      .menu summary::-webkit-details-marker {
        display: none;
      }

      .menu[open] summary {
        border-color: color-mix(in srgb, var(--color-accent) 48%, transparent);
        color: var(--color-accent);
      }

      .menu-items {
        position: absolute;
        top: calc(100% + var(--size-small));
        right: 0;
        z-index: 2;
        min-width: 10rem;
        padding: var(--size-small);
        border-radius: 18px;
        background: color-mix(in srgb, var(--color-secondary-surface) 98%, white);
        box-shadow: var(--shadow-hover);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
        display: grid;
      }

      .menu-items button {
        border: 0;
        border-radius: 12px;
        padding: var(--size-small) var(--size-medium);
        background: transparent;
        color: var(--color-primary-text);
        text-align: left;
      }

      .menu-items button:hover:not([disabled]) {
        transform: none;
        box-shadow: none;
        background: color-mix(in srgb, var(--color-accent) 12%, transparent);
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
    await this.refreshJobs();
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
          <div class="filter-actions">
            <button class=${this.filter === "active" ? "active" : ""} @click=${() => this.handleFilterChange("active")}>
              Active jobs
            </button>
            <button
              class=${this.filter === "archived" ? "active" : ""}
              @click=${() => this.handleFilterChange("archived")}>
              Archived jobs
            </button>
          </div>
        </div>

        ${!this.jobs || this.jobs.items.length === 0
          ? html`
              <div class="empty">
                ${this.filter === "archived" ? "No archived jobs yet." : "No jobs have been created yet."}
              </div>
            `
          : html`
              <section class="grid">${this.jobs.items.map((job) => this.renderJob(job))}</section>
            `}
      </main>
    `;
  }

  private renderJob(job: JobIndex): TemplateResult {
    const isUpdating = this.updatingJobId === job.id;
    return html`
      <article class="job-card">
        <div class="job-card-top">
          <div class="stage-row">
            <strong>${job.file}</strong>
            <span class=${`status-pill ${job.status}`}>${job.status}</span>
          </div>
          <details class="menu" @click=${this.handleMenuClick}>
            <summary aria-label="Job actions">${kebabIcon}</summary>
            <div class="menu-items">
              <button ?disabled=${isUpdating} @click=${(event: Event) => this.handleToggleArchive(event, job)}>
                ${isUpdating
                  ? job.archivedAt
                    ? "Restoring..."
                    : "Archiving..."
                  : job.archivedAt
                    ? "Restore"
                    : "Archive"}
              </button>
            </div>
          </details>
        </div>
        <a class="job-card-link" href=${`/jobs/${job.id}`}>
          <div>
            <div class="status-row">
              <span>Current stage</span>
              <span>${job.currentStage ?? "complete"}</span>
            </div>
            ${job.archivedAt
              ? html`
                  <div class="status-row">
                    <span>Archived</span>
                    <span>${new Date(job.archivedAt).toLocaleString()}</span>
                  </div>
                `
              : html``}
          </div>
          <div class="progress"><div class="progress-bar" style=${`width:${job.totalProgress}%`}></div></div>
          <div class="status-row">
            <span>Total progress</span>
            <span>${job.totalProgress}%</span>
          </div>
        </a>
      </article>
    `;
  }

  private openStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(
      streamJobsService.renderPath({ filter: this.filter, page: "1", pageSize: "20" }),
    );
    this.eventSource.addEventListener("jobs", (event) => {
      const message = event as MessageEvent<string>;
      this.jobs = JobListResponse.parse(JSON.parse(message.data));
    });
  }

  private handleFilterChange(filter: "active" | "archived"): void {
    if (filter === this.filter) {
      return;
    }

    this.filter = filter;
    void this.refreshJobs().then(() => {
      this.openStream();
    });
  }

  private async refreshJobs(): Promise<void> {
    this.jobs = await listJobsService.fetch({ filter: this.filter, page: "1", pageSize: "20" });
  }

  private handleMenuClick(event: Event): void {
    event.stopPropagation();
  }

  private async handleToggleArchive(event: Event, job: JobIndex): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.updatingJobId = job.id;

    try {
      if (job.archivedAt) {
        await restoreJobService.fetch({ jobId: job.id });
        dispatch(this, SuccessEvent("Job restored."));
      } else {
        await archiveJobService.fetch({ jobId: job.id });
        dispatch(this, SuccessEvent("Job archived."));
      }
      await this.refreshJobs();
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to update archive state."));
    } finally {
      this.updatingJobId = null;
    }
  }
}
