import { css, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { parseRouteParams } from "../shared/util.route-params.js";
import { getJobService } from "../shared/service.get-job.js";
import { streamJobService } from "../shared/service.stream-job.js";
import { approveJobImageService } from "../shared/service.approve-job-image.js";
import { generateJobImageService } from "../shared/service.generate-job-image.js";
import { selectJobSongService } from "../shared/service.select-job-song.js";
import { sendJobToContentfulService } from "../shared/service.send-job-to-contentful.js";
import { sendJobToNotionService } from "../shared/service.send-job-to-notion.js";
import { JobDetail, JobStage } from "../shared/type.job.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { aiIcon, detailsIcon, leftArrowIcon, refreshIcon } from "./icons.js";
import { dispatch } from "./util.events.js";
import { SuccessEvent } from "./event.success.js";
import { WarningEvent } from "./event.warning.js";

@customElement("rpg-chronicler-job-page")
export class RpgChroniclerJobPage extends RpgChroniclerAppProvider {
  private params = parseRouteParams("/jobs/:jobId", window.location.pathname);
  @state() private job: JobDetail | null = null;
  @state() private selectedSongUrl = "";
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

      .hero-grid,
      .stage-grid,
      .workflow-grid,
      .image-grid {
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

      .workflow-card,
      .context-card,
      .media-card {
        background: color-mix(in srgb, var(--color-secondary-surface) 90%, black);
        border-radius: 26px;
        padding: var(--size-large);
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

      input {
        width: 100%;
        box-sizing: border-box;
        border-radius: 18px;
        padding: var(--size-medium);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        background: color-mix(in srgb, var(--color-primary-background) 72%, transparent);
        color: var(--color-primary-text);
        font: inherit;
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

      .kind-pill,
      .context-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border-radius: 999px;
        padding: 0.35rem 0.8rem;
        font-size: var(--font-small);
        background: color-mix(in srgb, var(--color-primary-text) 10%, transparent);
      }

      .workflow-card.human .kind-pill {
        background: color-mix(in srgb, var(--color-warning) 18%, transparent);
        color: var(--color-warning);
      }

      .workflow-card.ai .kind-pill {
        background: color-mix(in srgb, var(--color-accent) 18%, transparent);
        color: var(--color-accent);
      }

      .context-list,
      .meta-list {
        display: grid;
        gap: var(--size-small);
      }

      .media-preview {
        width: 100%;
        aspect-ratio: 16 / 10;
        object-fit: cover;
        border-radius: 20px;
        background: color-mix(in srgb, var(--color-primary-background) 60%, transparent);
      }

      .image-grid {
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }

      .image-card {
        display: grid;
        gap: var(--size-medium);
        padding: var(--size-medium);
        border-radius: 24px;
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        background: color-mix(in srgb, var(--color-primary-background) 55%, transparent);
      }

      .image-card.selected {
        border-color: color-mix(in srgb, var(--color-accent) 58%, white);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 18%, transparent);
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
      return html`
        <main><p>Loading job...</p></main>
      `;
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
            <div class="metric">
              <span>Status</span>
              <strong class=${`status-pill ${this.job.status}`}>${this.job.status}</strong>
            </div>
            <div class="metric">
              <span>Progress</span>
              <strong>${this.job.totalProgress}%</strong>
            </div>
            <div class="metric">
              <span>Current stage</span>
              <strong>${this.job.currentStage ?? "complete"}</strong>
            </div>
            <div class="metric">
              <span>Artifacts</span>
              <strong>${this.job.artifacts.filter((artifact) => artifact.versionCount > 0).length}</strong>
            </div>
          </div>
        </section>

        <section class="panel">
          <h2>Workflow Overview</h2>
          <div class="workflow-grid">${this.job.stages.map((stage) => this.renderWorkflowCard(stage))}</div>
        </section>

        <section class="panel">
          <h2>Submission Context</h2>
          ${this.renderSubmissionContext()}
        </section>

        <section class="panel">
          <h2>Stages</h2>
          <div class="stage-grid">${this.job.stages.map((stage) => this.renderStage(stage))}</div>
        </section>

        <section class="panel">
          <h2>Image Review</h2>
          ${this.renderImageApproval()}
        </section>

        <section class="panel">
          <h2>Song Review</h2>
          ${this.renderSongApproval()}
        </section>

        <section class="panel">
          <h2>Contentful</h2>
          ${this.renderContentful()}
        </section>

        <section class="panel">
          <h2>Notion</h2>
          ${this.renderNotion()}
        </section>
      </main>
    `;
  }

  private renderWorkflowCard(stage: JobStage): TemplateResult {
    return html`
      <article class=${`workflow-card ${stage.kind} ${stage.status}`}>
        <div class="version-actions">
          <strong>${stage.label}</strong>
          <div class="kind-pill">
            ${stage.kind === "ai"
              ? html`
                  ${aiIcon} AI
                `
              : "Human"}
          </div>
        </div>
        <div class="stage-status">${stage.status}</div>
        <div class="progress"><div class="progress-bar" style=${`width:${stage.progress}%`}></div></div>
        <div>${stage.progress}%</div>
        ${stage.message
          ? html`
              <div>${stage.message}</div>
            `
          : html``}
      </article>
    `;
  }

  private renderSubmissionContext(): TemplateResult {
    const submission = this.job?.submission;
    if (!submission) {
      return html`
        <p>No submission context is attached to this job.</p>
      `;
    }
    return html`
      <div class="workflow-grid">
        <article class="context-card">
          <strong>Adventure</strong>
          <div>${submission.adventure?.title ?? "Not selected"}</div>
          ${submission.previousEvents.length > 0
            ? html`
                <div class="context-list">
                  ${submission.previousEvents.map(
                    (entry) => html`
                      <span class="context-pill">${entry.title}</span>
                    `,
                  )}
                </div>
              `
            : html`
                <div>No previous events selected.</div>
              `}
        </article>
        <article class="context-card">
          <strong>People</strong>
          <div class="meta-list">
            <div>
              <strong>GM:</strong>
              ${submission.gameMaster?.title ?? "Not selected"}
            </div>
            <div>
              <strong>Players:</strong>
              ${submission.players.length > 0 ? submission.players.map((entry) => entry.title).join(", ") : "None"}
            </div>
            <div>
              <strong>Characters:</strong>
              ${submission.characterAssignments.length > 0
                ? submission.characterAssignments
                    .map(({ character, player }) => `${character.title}${player ? ` (${player.title})` : ""}`)
                    .join(", ")
                : "None"}
            </div>
            <div>
              <strong>NPCs:</strong>
              ${submission.npcs.length > 0 ? submission.npcs.map((entry) => entry.title).join(", ") : "None"}
            </div>
          </div>
        </article>
        <article class="context-card">
          <strong>Places and Date</strong>
          <div class="meta-list">
            <div>
              <strong>Locations:</strong>
              ${submission.locations.length > 0 ? submission.locations.map((entry) => entry.title).join(", ") : "None"}
            </div>
            <div>
              <strong>Year:</strong>
              ${submission.selection.year ?? "Unset"}
            </div>
            <div>
              <strong>Month:</strong>
              ${submission.selection.month ?? "Unset"}
            </div>
            <div>
              <strong>Day:</strong>
              ${submission.selection.day ?? "Unset"}
            </div>
          </div>
        </article>
      </div>
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
        ${stage.message
          ? html`
              <div>${stage.message}</div>
            `
          : html``}
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
    const readyToSend = Boolean(
      contentful.title &&
      contentful.summary &&
      contentful.story &&
      contentful.dmNotes &&
      this.job.image.selectedAssetId &&
      this.job.song.songUrl,
    );

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
        <div><strong>Selected image</strong></div>
        <div>${this.job.image.selectedAssetId ?? "No approved image yet"}</div>
        <div><strong>Selected song</strong></div>
        <div>${this.job.song.songUrl ?? "No selected song yet"}</div>
        <div>
          <button ?disabled=${!readyToSend || contentful.status === "sending"} @click=${this.handleSendToContentful}>
            ${contentful.status === "sending" ? "Sending..." : "Approve and send to Contentful"}
          </button>
        </div>
      </div>
    `;
  }

  private renderImageApproval(): TemplateResult {
    if (!this.job) {
      return html``;
    }
    const images = this.job.image.generatedAssets;
    return html`
      <div class="contentful-preview">
        <div class="version-actions">
          <div>
            <strong>Status</strong>
            <div>${this.job.image.status}</div>
          </div>
          <button ?disabled=${this.job.image.status === "generating"} @click=${this.handleGenerateImage}>
            ${this.job.image.status === "generating"
              ? "Generating..."
              : html`
                  ${refreshIcon} Generate new image
                `}
          </button>
        </div>
        ${images.length === 0
          ? html`
              <p>No generated images yet.</p>
            `
          : html`
              <div class="image-grid">
                ${images.map((image) => {
                  const imageUrl = `/api/jobs/${this.params.jobId}/images/${image.id}`;
                  const isSelected = this.job?.image.selectedAssetId === image.id;
                  return html`
                    <article class=${`image-card ${isSelected ? "selected" : ""}`}>
                      <img class="media-preview" src=${imageUrl} alt=${image.prompt} />
                      <div>${image.prompt}</div>
                      <div>
                        ${image.approvedAt
                          ? `Approved ${new Date(image.approvedAt).toLocaleString()}`
                          : "Awaiting approval"}
                      </div>
                      <button ?disabled=${Boolean(image.approvedAt)} @click=${() => this.handleApproveImage(image.id)}>
                        ${image.approvedAt ? "Approved" : "Approve image"}
                      </button>
                    </article>
                  `;
                })}
              </div>
            `}
      </div>
    `;
  }

  private renderSongApproval(): TemplateResult {
    if (!this.job) {
      return html``;
    }
    const songPrompt = this.job.artifactVersions.songPrompt?.[0]?.text ?? this.job.contentful.story ?? "";
    const lyrics = this.job.artifactVersions.lyrics?.[0]?.text ?? "";
    return html`
      <div class="contentful-preview">
        <div><strong>Status</strong></div>
        <div>${this.job.song.status}</div>
        <div><strong>Current song prompt</strong></div>
        <pre>${songPrompt || "Song prompt not ready"}</pre>
        <div><strong>Current lyrics</strong></div>
        <pre>${lyrics || "Lyrics not ready"}</pre>
        <label>
          <span>Final song URL</span>
          <input
            .value=${this.selectedSongUrl || this.job.song.songUrl || ""}
            @input=${this.handleSongUrlInput}
            placeholder="https://..." />
        </label>
        <div class="actions">
          <button ?disabled=${!(this.selectedSongUrl || this.job.song.songUrl)} @click=${this.handleSelectSong}>
            Approve selected song
          </button>
        </div>
      </div>
    `;
  }

  private renderNotion(): TemplateResult {
    if (!this.job) {
      return html``;
    }
    if (this.job.notion.pageUrl) {
      return html`
        <div class="contentful-preview">
          <div>Sent ${this.job.notion.sentAt ? new Date(this.job.notion.sentAt).toLocaleString() : "recently"}</div>
          <a href=${this.job.notion.pageUrl} target="_blank" rel="noreferrer">Open Notion page</a>
        </div>
      `;
    }
    return html`
      <div class="contentful-preview">
        <div><strong>Status</strong></div>
        <div>${this.job.notion.status}</div>
        <button
          ?disabled=${this.job.notion.status === "sending" || !this.job.contentful.entryUrl}
          @click=${this.handleSendToNotion}>
          ${this.job.notion.status === "sending" ? "Sending..." : "Send DM notes to Notion"}
        </button>
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

  private handleSongUrlInput = (event: Event): void => {
    const target = event.currentTarget as HTMLInputElement;
    this.selectedSongUrl = target.value;
  };

  private async handleGenerateImage(): Promise<void> {
    try {
      this.job = await generateJobImageService.fetch({ jobId: this.params.jobId });
      dispatch(this, SuccessEvent("Generated a new image candidate."));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to generate an image."));
    }
  }

  private async handleApproveImage(imageId: string): Promise<void> {
    try {
      this.job = await approveJobImageService.fetch({ jobId: this.params.jobId, imageId });
      dispatch(this, SuccessEvent("Image approved."));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to approve the image."));
    }
  }

  private async handleSelectSong(): Promise<void> {
    try {
      const songUrl = this.selectedSongUrl || this.job?.song.songUrl;
      if (!songUrl) {
        throw new Error("Provide a song URL first.");
      }
      this.job = await selectJobSongService.fetch({
        jobId: this.params.jobId,
        songUrl,
        provider: "manual",
        externalSongId: null,
      });
      dispatch(this, SuccessEvent("Song approved."));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to save the selected song."));
    }
  }

  private async handleSendToNotion(): Promise<void> {
    try {
      this.job = await sendJobToNotionService.fetch({ jobId: this.params.jobId });
      dispatch(this, SuccessEvent("DM notes sent to Notion."));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to send DM notes to Notion."));
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
