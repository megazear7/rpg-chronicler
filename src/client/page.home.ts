import { css, html, TemplateResult } from "lit";
import { customElement, query, state } from "lit/decorators.js";
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
import { normalizeInstructionConfig } from "../shared/util.instructions.js";
import { updateAppConfigService } from "../shared/service.update-app-config.js";
import "./component.instructions-editor.js";
import { RpgChroniclerInstructionsEditor } from "./component.instructions-editor.js";

@customElement("rpg-chronicler-home-page")
export class RpgChroniclerHomePage extends RpgChroniclerAppProvider {
  @state() private selectedFile: File | null = null;
  @state() private submitting = false;
  @state() private latestJob: JobIndex | null = null;
  @state() private recentJobs: JobIndex[] = [];
  @state() private dragActive = false;
  @query("rpg-chronicler-instructions-editor") private instructionsEditor?: RpgChroniclerInstructionsEditor;

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
        transition:
          border-color 140ms ease,
          background 140ms ease,
          transform 140ms ease,
          box-shadow 140ms ease;
      }

      .upload-field.drag-active {
        border-color: color-mix(in srgb, var(--color-accent) 78%, white);
        background: color-mix(in srgb, var(--color-accent) 14%, var(--color-primary-background));
        transform: translateY(-1px);
        box-shadow:
          inset 0 1px 0 color-mix(in srgb, white 10%, transparent),
          0 0 0 3px color-mix(in srgb, var(--color-accent) 16%, transparent);
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
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .browser-link {
        width: fit-content;
        padding: var(--size-medium) var(--size-large);
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-primary-background) 88%, black);
        box-shadow: var(--shadow-normal);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
        text-decoration: none;
        color: var(--color-primary-text);
        cursor: pointer;
        transition: var(--transition-all);
      }

      .browser-link:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-hover);
        border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
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

      .review-panel {
        display: grid;
        gap: var(--size-large);
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
              <div
                class=${`upload-field ${this.dragActive ? "drag-active" : ""}`}
                @dragenter=${this.handleDragEnter}
                @dragover=${this.handleDragOver}
                @dragleave=${this.handleDragLeave}
                @drop=${this.handleDrop}>
                <div class="upload-title">
                  <div class="upload-icon">${audioIcon}</div>
                  <div>
                    <strong>Drop in your source audio</strong>
                    <div class="hint">MP3 and M4A are supported. Drag a file here or browse below. Larger files split automatically for processing.</div>
                  </div>
                </div>
                <input id="source-audio-input" class="file-input" type="file" accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a" @change=${this.handleFileChange} />
                <label class="browser-link" for="source-audio-input">Open file browser</label>
                <div class="actions">
                  <span>${this.selectedFile ? this.selectedFile.name : "No file selected"}</span>
                </div>
              </div>

              ${this.selectedFile
                ? html`
                    <section class="panel review-panel">
                      <div class="eyebrow">Step 2</div>
                      <h2>Adjust instructions before creating the job</h2>
                      <p>The opening paragraph is locked here. You can edit it from the dedicated instructions configuration page.</p>
                      <rpg-chronicler-instructions-editor
                        .config=${normalizeInstructionConfig(this.appContext.app?.instructions)}
                        .editableIntro=${false}></rpg-chronicler-instructions-editor>
                      <div class="actions">
                        <a class="browser-link" href="/instructions">Open instructions configuration</a>
                        <button ?disabled=${this.submitting} @click=${this.handleSubmit}>
                          ${this.submitting ? "Creating job..." : "Approve instructions and create job"}
                        </button>
                      </div>
                    </section>
                  `
                : html``}
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
          <a href="/instructions">Configure instructions</a>
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
    this.setSelectedFile(input.files?.[0] ?? null);
  }

  private handleDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = true;
  }

  private handleDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = true;
  }

  private handleDragLeave(event: DragEvent): void {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && (event.currentTarget as HTMLElement).contains(nextTarget)) {
      return;
    }
    this.dragActive = false;
  }

  private handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.setSelectedFile(file);
  }

  private setSelectedFile(file: File | null): void {
    if (!file) {
      this.selectedFile = null;
      return;
    }

    const fileName = file.name.toLowerCase();
    const mime = file.type.toLowerCase();
    const isSupported =
      fileName.endsWith(".mp3") ||
      fileName.endsWith(".m4a") ||
      mime === "audio/mpeg" ||
      mime === "audio/mp4" ||
      mime === "audio/x-m4a" ||
      mime === "audio/mp4a-latm";

    if (!isSupported) {
      dispatch(this, WarningEvent("Uploaded file must be an MP3 or M4A audio file."));
      return;
    }

    this.selectedFile = file;
  }

  private async handleSubmit(): Promise<void> {
    if (!this.selectedFile) {
      dispatch(this, WarningEvent("Select an audio file before submitting."));
      return;
    }
    if (!this.appContext.app || !this.instructionsEditor) {
      dispatch(this, WarningEvent("Instruction configuration is not ready yet."));
      return;
    }

    this.submitting = true;
    try {
      const instructions = this.instructionsEditor.getValue();
      const updatedAppConfig = await updateAppConfigService.fetch({
        ...this.appContext.app,
        instructions,
      });
      this.appContext = {
        ...this.appContext,
        app: updatedAppConfig,
      };
      const instructionsText = this.instructionsEditor.getComputedInstructions();
      this.latestJob = await createJobService.fetch({ file: this.selectedFile, instructionsText });
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
