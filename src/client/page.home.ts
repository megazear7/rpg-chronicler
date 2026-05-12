import { css, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { createJobService } from "../shared/service.create-job.js";
import { JobIndex } from "../shared/type.job.js";
import { dispatch } from "./util.events.js";
import { SuccessEvent } from "./event.success.js";
import { WarningEvent } from "./event.warning.js";
import { NavigationEvent } from "./event.navigation.js";

@customElement("rpg-chronicler-home-page")
export class RpgChroniclerHomePage extends RpgChroniclerAppProvider {
  @state() private selectedFile: File | null = null;
  @state() private submitting = false;
  @state() private latestJob: JobIndex | null = null;

  static override styles = [
    globalStyles,
    css`
      main {
        padding: var(--size-large);
      }

      .hero {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: var(--size-large);
        align-items: start;
      }

      .panel {
        background: var(--color-secondary-surface);
        border-radius: var(--radius-large);
        padding: var(--size-large);
        box-shadow: var(--shadow-passive);
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
        margin-top: var(--size-large);
      }

      .file-input {
        width: 100%;
      }

      button {
        border: none;
        border-radius: var(--radius-medium);
        background: linear-gradient(135deg, var(--color-1), var(--color-2));
        color: var(--color-primary-text);
        padding: var(--size-medium) var(--size-large);
        cursor: pointer;
        font-size: var(--font-medium);
      }

      button[disabled] {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .job-meta {
        display: grid;
        gap: var(--size-small);
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
        main {
          padding: var(--size-medium);
        }
      }
    `,
  ];

  override render(): TemplateResult {
    return html`
      <main>
        <section class="hero">
          <article class="panel">
            <div class="eyebrow">Session Processing</div>
            <h1>Upload audio and create a new job</h1>
            <p>Submit an MP3 or M4A recording and the server will generate bullet points, notes, summaries, story text, and related artifacts under the data/jobs directory.</p>
            <input class="file-input" type="file" accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a" @change=${this.handleFileChange} />
            <div class="actions">
              <button ?disabled=${this.submitting || this.selectedFile === null} @click=${this.handleSubmit}>
                ${this.submitting ? "Submitting..." : "Create job"}
              </button>
              <span>${this.selectedFile ? this.selectedFile.name : "No file selected"}</span>
            </div>
            <p class="hint">Large files continue processing after upload completes.</p>
          </article>

          <article class="panel">
            <div class="eyebrow">Latest Job</div>
            ${this.latestJob
              ? html`
                  <h2>${this.latestJob.file}</h2>
                  <div class="job-meta">
                    <div class="meta-row"><span>ID</span><strong>${this.latestJob.id}</strong></div>
                    <div class="meta-row"><span>Status</span><strong>${this.latestJob.status}</strong></div>
                    <div class="meta-row"><span>Total progress</span><strong>${this.latestJob.totalProgress}%</strong></div>
                    <div class="meta-row"><span>Current stage</span><strong>${this.latestJob.currentStage ?? "complete"}</strong></div>
                  </div>
                `
              : html`<p>No upload has been submitted in this browser session yet.</p>`}
          </article>
        </section>
      </main>
    `;
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
