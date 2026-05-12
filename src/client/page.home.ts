import { css, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { createJobService } from "../shared/service.create-job.js";
import { listJobsService } from "../shared/service.list-jobs.js";
import { JobIndex } from "../shared/type.job.js";
import { dispatch } from "./util.events.js";
import { SuccessEvent } from "./event.success.js";
import { WarningEvent } from "./event.warning.js";
import { NavigationEvent } from "./event.navigation.js";
import { audioIcon, rightArrowIcon } from "./icons.js";

@customElement("rpg-chronicler-home-page")
export class RpgChroniclerHomePage extends RpgChroniclerAppProvider {
  @state() private selectedFile: File | null = null;
  @state() private submitting = false;
  @state() private latestJob: JobIndex | null = null;
  @state() private recentJobs: JobIndex[] = [];

  static override styles = [
    globalStyles,
    css`
      main {
        padding: var(--size-large);
        display: grid;
        gap: var(--size-large);
      }

      .shell {
        display: grid;
        gap: var(--size-large);
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
        gap: var(--size-large);
        align-items: start;
      }

      .panel {
        background:
          radial-gradient(circle at top right, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 38%),
          linear-gradient(180deg, color-mix(in srgb, var(--color-secondary-surface) 96%, white), var(--color-secondary-surface));
        border-radius: 32px;
        padding: var(--size-large);
        box-shadow: var(--shadow-hover);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 8%, transparent);
      }

      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: var(--font-small);
        opacity: 0.7;
        margin-bottom: var(--size-small);
      }

      .actions {
        display: flex;
        gap: var(--size-medium);
        flex-wrap: wrap;
        align-items: center;
        margin-top: var(--size-medium);
      }

      .upload-field {
        display: grid;
        gap: var(--size-medium);
        margin-top: var(--size-large);
        padding: var(--size-large);
        border-radius: 28px;
        border: 2px dashed color-mix(in srgb, var(--color-accent) 38%, transparent);
        background: color-mix(in srgb, var(--color-primary-background) 50%, transparent);
        box-shadow: inset 0 1px 0 color-mix(in srgb, white 10%, transparent);
      }

      .upload-title {
        display: flex;
        gap: var(--size-medium);
        align-items: center;
      }

      .upload-icon {
        width: 52px;
        height: 52px;
        display: grid;
        place-items: center;
        border-radius: 18px;
        background: color-mix(in srgb, var(--color-accent) 20%, transparent);
        color: var(--color-accent);
      }

      .file-input {
        width: 100%;
        border-radius: 20px;
        padding: var(--size-medium);
        background: color-mix(in srgb, var(--color-primary-background) 65%, transparent);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        color: var(--color-primary-text);
      }

      button {
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-primary-background) 65%, transparent);
        color: var(--color-primary-text);
        padding: var(--size-medium) var(--size-large);
        cursor: pointer;
        font-size: var(--font-medium);
        box-shadow: var(--shadow-normal);
        transition: var(--transition-all);
      }

      button:hover:not([disabled]) {
        transform: translateY(-1px);
        box-shadow: var(--shadow-hover);
        border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
      }

      button[disabled] {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .job-meta {
        display: grid;
        gap: var(--size-small);
      }

      .recent-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: var(--size-large);
      }

      .recent-card {
        display: grid;
        gap: var(--size-medium);
        padding: var(--size-large);
        border-radius: 28px;
        background: color-mix(in srgb, var(--color-secondary-surface) 88%, black);
        box-shadow: var(--shadow-normal);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 0.35rem 0.8rem;
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
        background: color-mix(in srgb, var(--color-warning) 18%, transparent);
        color: var(--color-warning);
      }

      .bottom-nav {
        position: sticky;
        bottom: var(--size-medium);
        display: flex;
        justify-content: center;
        z-index: 10;
      }

      .bottom-nav a {
        padding: var(--size-medium) var(--size-large);
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-primary-background) 88%, black);
        box-shadow: var(--shadow-hover);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: var(--size-medium);
        border-bottom: 1px solid color-mix(in srgb, var(--color-primary-text) 15%, transparent);
        padding-bottom: var(--size-small);
      }

      .meta-row:last-child {
        border-bottom: none;
      }

      .hint {
        opacity: 0.7;
        margin-top: var(--size-medium);
      }

      @media (max-width: 720px) {
        .hero {
          grid-template-columns: 1fr;
        }

        main {
          padding: var(--size-medium);
        }
      }
    `,
  ];

  override render(): TemplateResult {
    return html`
      <main>
        <div class="shell">
          <section class="hero">
            <article class="panel">
              <div class="eyebrow">Session Processing</div>
              <h1>Turn raw session audio into a tracked publishing workflow</h1>
              <p>Upload a recording, watch each stage update live, inspect logs, edit generated artifacts, and send approved output to Contentful only when it is ready.</p>
              <div class="upload-field">
                <div class="upload-title">
                  <div class="upload-icon">${audioIcon}</div>
                  <div>
                    <strong>Drop in your source audio</strong>
                    <div class="hint">MP3 and M4A are supported. Larger files split automatically for processing.</div>
                  </div>
                </div>
                <input class="file-input" type="file" accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a" @change=${this.handleFileChange} />
                <div class="actions">
                  <button ?disabled=${this.submitting || this.selectedFile === null} @click=${this.handleSubmit}>
                    ${this.submitting ? "Submitting..." : "Create job"}
                  </button>
                  <span>${this.selectedFile ? this.selectedFile.name : "No file selected"}</span>
                </div>
              </div>
            </article>

            <article class="panel">
              <div class="eyebrow">Latest Job</div>
              ${this.latestJob
                ? html`
                    <h2>${this.latestJob.file}</h2>
                    <div class="job-meta">
                      <div class="meta-row"><span>ID</span><strong>${this.latestJob.id}</strong></div>
                      <div class="meta-row"><span>Status</span><strong class=${`status-pill ${this.latestJob.status}`}>${this.latestJob.status}</strong></div>
                      <div class="meta-row"><span>Total progress</span><strong>${this.latestJob.totalProgress}%</strong></div>
                      <div class="meta-row"><span>Current stage</span><strong>${this.latestJob.currentStage ?? "complete"}</strong></div>
                    </div>
                  `
                : html`<p>No upload has been submitted in this browser session yet.</p>`}
            </article>
          </section>

          <section class="panel">
            <div class="eyebrow">Recent Jobs</div>
            <h2>Most recent activity</h2>
            ${this.recentJobs.length === 0
              ? html`<p>No recent jobs yet.</p>`
              : html`
                  <div class="recent-grid">
                    ${this.recentJobs.map(
                      (job) => html`
                        <article class="recent-card">
                          <div class="status-pill ${job.status}">${job.status}</div>
                          <strong>${job.file}</strong>
                          <div>Progress ${job.totalProgress}%</div>
                          <div>Stage ${job.currentStage ?? "complete"}</div>
                          <a href=${`/jobs/${job.id}`}>Open job ${rightArrowIcon}</a>
                        </article>
                      `,
                    )}
                  </div>
                `}
          </section>
        </div>

        <nav class="bottom-nav">
          <a href="/jobs">Browse all jobs ${rightArrowIcon}</a>
        </nav>
      </main>
    `;
  }

  override async load(): Promise<void> {
    await super.load();
    const jobs = await listJobsService.fetch({ page: "1", pageSize: "4" });
    this.recentJobs = jobs.items;
  }

  private handleFileChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  private async handleSubmit(): Promise<void> {
    if (!this.selectedFile) {
      dispatch(this, WarningEvent("Select an audio file before submitting."));
      return;
    }

    this.submitting = true;
    try {
      this.latestJob = await createJobService.fetch({ file: this.selectedFile });
      this.recentJobs = [this.latestJob, ...this.recentJobs.filter((job) => job.id !== this.latestJob!.id)].slice(0, 4);
      dispatch(this, SuccessEvent("Job created and processing started."));
      dispatch(this, NavigationEvent({ path: `/jobs/${this.latestJob.id}` }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit job.";
      dispatch(this, WarningEvent(message));
    } finally {
      this.submitting = false;
    }
  }
}
