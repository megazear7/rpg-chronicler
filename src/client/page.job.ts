import { css, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { parseRouteParams } from "../shared/util.route-params.js";
import { getJobService } from "../shared/service.get-job.js";
import { streamJobService } from "../shared/service.stream-job.js";
import { approveJobImageService } from "../shared/service.approve-job-image.js";
import { rejectJobImageService } from "../shared/service.reject-job-image.js";
import { selectJobSongService } from "../shared/service.select-job-song.js";
import { sendJobToContentfulService } from "../shared/service.send-job-to-contentful.js";
import { sendJobToNotionService } from "../shared/service.send-job-to-notion.js";
import { updateArtifactService } from "../shared/service.update-artifact.js";
import { archiveJobService } from "../shared/service.archive-job.js";
import { restoreJobService } from "../shared/service.restore-job.js";
import { ArtifactDetail, ArtifactKey, JobDetail, JobStage, JobStageName } from "../shared/type.job.js";
import { UsageBreakdown, UsageSummary } from "../shared/type.prompt.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import "./component.tooltip.js";
import { copyIcon, detailsIcon, leftArrowIcon, refreshIcon, xIcon } from "./icons.js";
import { restartJobService } from "../shared/service.restart-job.js";
import { restartJobStageService } from "../shared/service.restart-job-stage.js";
import { dispatch } from "./util.events.js";
import { SuccessEvent } from "./event.success.js";
import { WarningEvent } from "./event.warning.js";

const SONG_REVIEW_FIELDS: Array<{ key: ArtifactKey; label: string; multiline: boolean }> = [
  { key: "title", label: "Title", multiline: false },
  { key: "songPrompt", label: "Song prompt", multiline: true },
  { key: "lyrics", label: "Lyrics", multiline: true },
];

const CONTENTFUL_FIELDS: Array<{ key: ArtifactKey; label: string; multiline: boolean }> = [
  { key: "title", label: "Title", multiline: false },
  { key: "summary", label: "Summary", multiline: true },
  { key: "story", label: "Story", multiline: true },
  { key: "dmNotes", label: "DM notes", multiline: true },
];

const STAGE_ABBREVIATIONS: Record<JobStageName, string> = {
  upload: "UP",
  configure_context: "CF",
  prepare_audio: "PA",
  bullet_points: "BP",
  play_by_play: "PP",
  dm_notes: "DN",
  summary: "SU",
  story: "ST",
  title: "TI",
  image_prompt: "IP",
  image_generation: "IG",
  image_approval: "IA",
  lyrics: "LY",
  song_prompt: "SP",
  song_approval: "SA",
  contentful: "CO",
  notion: "NO",
};

@customElement("rpg-chronicler-job-page")
export class RpgChroniclerJobPage extends RpgChroniclerAppProvider {
  private params = parseRouteParams("/jobs/:jobId", window.location.pathname);
  @state() private job: JobDetail | null = null;
  @state() private lightboxImage: { src: string; alt: string } | null = null;
  @state() private selectedSongUrl = "";
  @state() private songReviewEditors: Partial<Record<ArtifactKey, string>> = {};
  @state() private contentfulEditors: Partial<Record<ArtifactKey, string>> = {};
  @state() private copiedSongField: ArtifactKey | null = null;
  @state() private savingSongFields: Partial<Record<ArtifactKey, boolean>> = {};
  @state() private savingContentfulFields: Partial<Record<ArtifactKey, boolean>> = {};
  @state() private restarting = false;
  @state() private restartingStageName: JobStageName | null = null;
  @state() private updatingArchiveState = false;
  @state() private sendingToNotion = false;
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
      .image-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: var(--size-large);
      }

      .workflow-grid {
        display: grid;
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
        display: flex;
        flex-direction: column;
        gap: var(--size-medium);
        box-shadow: var(--shadow-normal);
      }

      .context-card,
      .media-card {
        border-radius: 26px;
        display: grid;
        gap: var(--size-medium);
        margin-top: var(--size-medium);
      }

      .stage-message {
        word-break: break-all;
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
        display: inline-flex;
        align-items: center;
        gap: var(--size-tiny);
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

      textarea {
        width: 100%;
        min-height: 25rem;
        box-sizing: border-box;
        border-radius: 18px;
        padding: var(--size-medium);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        background: color-mix(in srgb, var(--color-primary-background) 72%, transparent);
        color: var(--color-primary-text);
        font: inherit;
        line-height: 1.6;
        resize: vertical;
      }

      .contentful-preview {
        display: grid;
        gap: var(--size-medium);
      }

      .song-review-header,
      .song-review-field-header,
      .song-review-field-actions,
      .actions {
        display: flex;
        gap: var(--size-small);
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
      }

      .song-review-field,
      .contentful-field {
        display: grid;
        gap: var(--size-small);
        margin-top: var(--size-large);
      }

      .song-review-field strong,
      .contentful-field strong {
        font-size: 1rem;
      }

      .link-chip {
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-radius: 999px;
        padding: var(--size-small) var(--size-medium);
        background: color-mix(in srgb, var(--color-primary-background) 68%, transparent);
        color: var(--color-primary-text);
        box-shadow: var(--shadow-normal);
        text-decoration: none;
      }

      .link-chip:hover {
        text-decoration: underline;
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

      .kind-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border-radius: 999px;
        padding: 0.35rem 0.8rem;
        font-size: var(--font-small);
        background: color-mix(in srgb, var(--color-primary-text) 10%, transparent);
      }

      .workflow-bar {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(2.75rem, 1fr));
        gap: 0.35rem;
      }

      .workflow-stage {
        width: 100%;
        min-height: 3.5rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        background: color-mix(in srgb, var(--color-primary-background) 55%, transparent);
        color: var(--color-primary-text);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        box-shadow: var(--shadow-normal);
      }

      .workflow-stage[tabindex] {
        cursor: help;
      }

      .workflow-stage:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 4px;
      }

      .workflow-tooltip-card {
        min-width: 14rem;
        display: grid;
        gap: var(--size-small);
      }

      .workflow-stage.pending {
        background: color-mix(in srgb, var(--color-warning) 18%, transparent);
        color: var(--color-warning);
      }

      .workflow-stage.running {
        background: color-mix(in srgb, var(--color-accent) 24%, transparent);
        color: var(--color-accent);
      }

      .workflow-stage.completed {
        background: color-mix(in srgb, var(--color-success) 22%, transparent);
        color: var(--color-success);
      }

      .workflow-stage.failed {
        background: color-mix(in srgb, var(--color-error) 22%, transparent);
        color: #ff9797;
      }

      .workflow-summary {
        display: flex;
        gap: var(--size-small);
        flex-wrap: wrap;
        align-items: center;
      }

      .context-list,
      .meta-list {
        display: grid;
        gap: var(--size-small);
      }

      .usage-pills {
        display: flex;
        flex-wrap: wrap;
        gap: var(--size-small);
      }

      .media-preview {
        max-height: var(--size-5x);
        border-radius: var(--border-radius-medium);
      }

      .media-preview-button,
      .contentful-selected-image-button {
        padding: 0;
        width: fit-content;
        max-width: 100%;
        border: 0;
        border-radius: var(--border-radius-medium);
        background: transparent;
        box-shadow: none;
      }

      .media-preview-button {
        cursor: zoom-in;
      }

      .media-preview-button:focus-visible,
      .contentful-selected-image-button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 4px;
      }

      .image-grid {
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }

      .image-card {
        display: grid;
        gap: var(--size-medium);
      }

      .song-embed {
        display: grid;
        gap: var(--size-small);
      }

      .song-embed iframe {
        width: 100%;
        min-height: 240px;
        border: 0;
        border-radius: 24px;
        background: color-mix(in srgb, var(--color-primary-background) 55%, transparent);
      }

      .contentful-selected-image {
        display: block;
        max-width: 100%;
        max-height: var(--size-3x);
        border-radius: 20px;
        object-fit: contain;
        background: color-mix(in srgb, var(--color-primary-background) 55%, transparent);
      }

      .image-lightbox {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
        padding: var(--size-large);
        background: color-mix(in srgb, black 82%, transparent);
        backdrop-filter: blur(10px);
      }

      .image-lightbox-dialog {
        display: grid;
        gap: var(--size-small);
        width: min(96vw, 1400px);
        max-height: calc(100vh - (var(--size-large) * 2));
      }

      .image-lightbox-close {
        justify-self: end;
      }

      .image-lightbox-preview {
        display: block;
        width: 100%;
        max-height: calc(100vh - 8rem);
        object-fit: contain;
        border-radius: 24px;
        background: color-mix(in srgb, var(--color-primary-background) 28%, black);
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
    window.document.body.style.overflow = "auto";
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

    const canRestartFailedJob =
      this.job.status === "failed" &&
      this.job.stages.some(
        (stage) =>
          [
            "prepare_audio",
            "bullet_points",
            "play_by_play",
            "dm_notes",
            "summary",
            "story",
            "title",
            "image_prompt",
            "image_generation",
            "lyrics",
            "song_prompt",
          ].includes(stage.name) && stage.status === "failed",
      );

    return html`
      <main>
        <section class="hero">
          <div class="version-actions">
            <a href="/jobs">${leftArrowIcon} Jobs</a>
            <div class="version-actions">
              ${canRestartFailedJob
                ? html`
                    <button ?disabled=${this.restarting} @click=${this.handleRestartFromFailed}>
                      ${this.restarting
                        ? "Restarting..."
                        : html`
                            ${refreshIcon} Restart from failed
                          `}
                    </button>
                  `
                : html``}
              <button ?disabled=${this.updatingArchiveState} @click=${this.handleToggleArchive}>
                ${this.updatingArchiveState
                  ? this.job.archivedAt
                    ? "Restoring..."
                    : "Archiving..."
                  : this.job.archivedAt
                    ? "Restore"
                    : "Archive"}
              </button>
              <a href=${`/jobs/${this.params.jobId}/logs`}>Logs ${detailsIcon}</a>
            </div>
          </div>
          <h1>${this.job.file}</h1>
          <div class="hero-grid">
            <div class="metric">
              <span>Status</span>
              <strong class=${`status-pill ${this.job.status}`}>${this.job.status}</strong>
            </div>
            <div class="metric">
              <span>Archived</span>
              <strong>${this.job.archivedAt ? new Date(this.job.archivedAt).toLocaleString() : "No"}</strong>
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
            <div class="metric">
              <span>Total tokens</span>
              <strong>${this.formatNumber(this.job.usage.total.totalTokens)}</strong>
            </div>
            <div class="metric">
              <span>Total cost</span>
              <strong>${this.formatCurrency(this.job.usage.total.totalCost)}</strong>
            </div>
          </div>
        </section>

        <section class="panel">
          <h2>Usage</h2>
          ${this.renderUsageSummary(this.job.usage)}
        </section>

        <section class="panel">
          <h2>Workflow Overview</h2>
          ${this.renderWorkflowOverview()}
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
      ${this.renderImageLightbox()}
    `;
  }

  private renderWorkflowOverview(): TemplateResult {
    return html`
      <div class="workflow-grid">
        <div class="workflow-summary">
          <span class="pill">
            ${this.job?.stages.filter((stage) => stage.status === "completed").length ?? 0} completed
          </span>
          <span class="pill">${this.job?.currentStage ?? "complete"}</span>
        </div>
        <div class="workflow-bar">
          ${this.job?.stages.map(
            (stage) => html`
              <rpg-chronicler-tooltip>
                <div
                  class=${`workflow-stage ${stage.status}`}
                  tabindex="0"
                  aria-label=${`${stage.label}: ${stage.status}`}>
                  ${STAGE_ABBREVIATIONS[stage.name]}
                </div>
                <div slot="content">${this.renderWorkflowTooltipContent(stage)}</div>
              </rpg-chronicler-tooltip>
            `,
          )}
        </div>
      </div>
    `;
  }

  private renderWorkflowTooltipContent(stage: JobStage): TemplateResult {
    return html`
      <div class="workflow-tooltip-card">${this.renderStageSummary(stage, false)}</div>
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
          <strong>Previous Events</strong>
          ${submission.previousEvents.length > 0
            ? html`
                <div class="context-list">
                  ${submission.previousEvents.map(
                    (entry) => html`
                      <span>${entry.title}</span>
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
    const canForceRestart = stage.kind === "ai";
    const isRestarting = this.restartingStageName === stage.name;
    return html`
      <article class=${`stage-card ${stage.status}`}>
        ${this.renderStageSummary(stage, true)}
        ${canForceRestart
          ? html`
              <div class="version-actions">
                <button ?disabled=${isRestarting} @click=${() => this.handleForceRestartStage(stage.name)}>
                  ${refreshIcon} ${isRestarting ? "Restarting..." : "Force restart"}
                </button>
              </div>
            `
          : html``}
      </article>
    `;
  }

  private renderStageSummary(stage: JobStage, linkLabel: boolean): TemplateResult {
    return html`
      <div>
        <strong>
          ${linkLabel
            ? html`
                <a class="stage-link" href=${this.renderStagePath(stage.name)}>${stage.label}</a>
              `
            : stage.label}
        </strong>
      </div>
      <div class="stage-status">${stage.status}</div>
      <div class="progress"><div class="progress-bar" style=${`width:${stage.progress}%`}></div></div>
      <div>${stage.progress}%</div>
      ${stage.message
        ? html`
            <div class="stage-message">${stage.message}</div>
          `
        : html``}
    `;
  }

  private renderUsageSummary(usage: UsageBreakdown): TemplateResult {
    return html`
      <div class="hero-grid">
        ${this.renderUsageMetric("Input tokens", usage.total.inputTokens)}
        ${this.renderUsageMetric("Output tokens", usage.total.outputTokens)}
        ${this.renderUsageMetric("Total tokens", usage.total.totalTokens)}
        <div class="metric">
          <span>Total cost</span>
          <strong>${this.formatCurrency(usage.total.totalCost)}</strong>
        </div>
      </div>
      ${usage.total.totalTokens === 0
        ? html`
            <p>
              No tracked model usage is available for this job yet. Older jobs created before usage tracking was added
              will show zero here.
            </p>
          `
        : html``}
      <div class="usage-pills">
        ${this.renderUsagePill("Text", usage.text)} ${this.renderUsagePill("Audio", usage.audio)}
        ${this.renderUsagePill("Image", usage.image)}
      </div>
    `;
  }

  private renderUsageMetric(label: string, value: number): TemplateResult {
    return html`
      <div class="metric">
        <span>${label}</span>
        <strong>${this.formatNumber(value)}</strong>
      </div>
    `;
  }

  private renderUsagePill(label: string, usage: UsageSummary): TemplateResult {
    return html`
      <span class="pill">
        ${label}: ${this.formatNumber(usage.totalTokens)} tokens, ${this.formatCurrency(usage.totalCost)}
      </span>
    `;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
      maximumFractionDigits: 6,
    }).format(value);
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat().format(value);
  }

  private renderStagePath(stageName: JobStage["name"]): string {
    return `/jobs/${this.params.jobId}/stage/${stageName.replace(/_/g, "-")}`;
  }

  private renderContentful(): TemplateResult {
    if (!this.job) {
      return html``;
    }

    const contentful = this.job.contentful;
    const approvedImages = this.resolveApprovedImages();
    const selectedSongUrl = this.job.song.songUrl;
    const imageReviewComplete =
      this.job.stages.find((stage) => stage.name === "image_approval")?.status === "completed";
    const readyToSend = Boolean(
      contentful.title &&
      contentful.summary &&
      contentful.story &&
      contentful.dmNotes &&
      imageReviewComplete &&
      this.job.song.songUrl,
    );

    if (contentful.entryUrl) {
      return html`
        <div class="contentful-preview">
          <div><strong>${contentful.title}</strong></div>
          <pre>${contentful.summary}</pre>
          <div><strong>Approved images</strong></div>
          ${this.renderContentfulApprovedImages(approvedImages)}
          ${selectedSongUrl
            ? this.renderSongEmbed(selectedSongUrl, "Selected song")
            : html`
                <div>No selected song yet</div>
              `}
          <div>Sent ${contentful.sentAt ? new Date(contentful.sentAt).toLocaleString() : "recently"}</div>
          <a href=${contentful.entryUrl} target="_blank" rel="noreferrer">Open Contentful entry</a>
        </div>
      `;
    }

    return html`
      <div class="contentful-preview">
        ${CONTENTFUL_FIELDS.map((field) => this.renderContentfulField(field.key, field.label, field.multiline))}
        <div><strong>Approved images</strong></div>
        ${this.renderContentfulApprovedImages(approvedImages)}
        ${selectedSongUrl
          ? this.renderSongEmbed(selectedSongUrl, "Selected song")
          : html`
              <div>No selected song yet</div>
            `}
        <div>
          <button ?disabled=${!readyToSend || contentful.status === "sending"} @click=${this.handleSendToContentful}>
            ${contentful.status === "sending" ? "Sending..." : "Approve and send to Contentful"}
          </button>
        </div>
      </div>
    `;
  }

  private renderContentfulApprovedImages(images: JobDetail["image"]["generatedAssets"]): TemplateResult {
    if (images.length === 0) {
      return html`
        <div>No approved images</div>
      `;
    }

    return html`
      <div class="image-grid">
        ${images.map((image) => {
          const imageUrl = `/api/jobs/${this.params.jobId}/images/${image.id}`;
          return html`
            <button
              class="contentful-selected-image-button"
              @click=${() => this.handleOpenImageLightbox(imageUrl, image.prompt)}
              aria-label="Open approved image in full page viewer">
              <img class="contentful-selected-image" src=${imageUrl} alt=${image.prompt} />
            </button>
          `;
        })}
      </div>
    `;
  }

  private renderContentfulField(key: ArtifactKey, label: string, multiline: boolean): TemplateResult {
    const value = this.resolveContentfulEditorValue(key);
    const saveLabel = this.savingContentfulFields[key] ? "Saving..." : "Save";
    const placeholder = `${label} not ready`;

    return html`
      <section class="contentful-field">
        <div class="song-review-field-header">
          <strong>${label}</strong>
          <button
            ?disabled=${this.savingContentfulFields[key] || value.trim().length === 0}
            @click=${() => this.handleSaveContentfulField(key, label)}>
            ${saveLabel}
          </button>
        </div>
        ${multiline
          ? html`
              <textarea
                .value=${value}
                placeholder=${placeholder}
                @input=${(event: Event) => this.handleContentfulEditorInput(key, event)}></textarea>
            `
          : html`
              <input
                .value=${value}
                placeholder=${placeholder}
                @input=${(event: Event) => this.handleContentfulEditorInput(key, event)} />
            `}
      </section>
    `;
  }

  private renderImageApproval(): TemplateResult {
    if (!this.job) {
      return html``;
    }
    const reviewedCount = this.job.image.generatedAssets.filter((image) => image.approvedAt || image.rejectedAt).length;
    const approvedCount = this.resolveApprovedImages().length;
    const prompts = this.job.image.prompts;
    return html`
      <div class="contentful-preview">
        <div class="version-actions">
          <div>
            <strong>Status</strong>
            <div>${this.job.image.status}</div>
          </div>
          <div class="song-review-field-actions">
            <span class="pill">${reviewedCount}/${prompts.length} reviewed</span>
            <span class="pill">${approvedCount} approved</span>
          </div>
        </div>
        ${prompts.length === 0
          ? html`
              <p>No image prompts have been generated yet.</p>
            `
          : html`
              <div class="image-grid">
                ${prompts.map((prompt) => {
                  const image = this.job?.image.generatedAssets.find((asset) => asset.promptId === prompt.id) ?? null;
                  const imageUrl = image ? `/api/jobs/${this.params.jobId}/images/${image.id}` : null;
                  const statusLabel = image?.approvedAt
                    ? `Approved ${new Date(image.approvedAt).toLocaleString()}`
                    : image?.rejectedAt
                      ? `Rejected ${new Date(image.rejectedAt).toLocaleString()}`
                      : image
                        ? "Awaiting review"
                        : "Image not available";
                  return html`
                    <article class="image-card">
                      <strong>${prompt.label}</strong>
                      <div>${prompt.storyPart}</div>
                      ${image && imageUrl
                        ? html`
                            <button
                              class="media-preview-button"
                              @click=${() => this.handleOpenImageLightbox(imageUrl, prompt.prompt)}
                              aria-label="Open image preview in full page viewer">
                              <img class="media-preview" src=${imageUrl} alt=${prompt.prompt} />
                            </button>
                          `
                        : html`
                            <div>No image available.</div>
                          `}
                      <div>${prompt.prompt}</div>
                      <div>${statusLabel}</div>
                      <div class="song-review-field-actions">
                        <button
                          ?disabled=${!image || Boolean(image.approvedAt) || Boolean(image.rejectedAt)}
                          @click=${() => image && this.handleApproveImage(image.id)}>
                          ${image?.approvedAt ? "Approved" : "Approve image"}
                        </button>
                        <button
                          class="secondary"
                          ?disabled=${!image || Boolean(image.approvedAt) || Boolean(image.rejectedAt)}
                          @click=${() => image && this.handleRejectImage(image.id)}>
                          ${image?.rejectedAt ? "Rejected" : "Reject image"}
                        </button>
                      </div>
                    </article>
                  `;
                })}
              </div>
            `}
      </div>
    `;
  }

  private renderImageLightbox(): TemplateResult {
    if (!this.lightboxImage) {
      return html``;
    }

    return html`
      <div class="image-lightbox" @click=${this.handleCloseImageLightbox}>
        <div class="image-lightbox-dialog" @click=${this.handleImageLightboxDialogClick}>
          <button class="image-lightbox-close" @click=${this.handleCloseImageLightbox} aria-label="Close image viewer">
            ${xIcon} Close
          </button>
          <img class="image-lightbox-preview" src=${this.lightboxImage.src} alt=${this.lightboxImage.alt} />
        </div>
      </div>
    `;
  }

  private renderSongApproval(): TemplateResult {
    if (!this.job) {
      return html``;
    }
    const songUrl = this.selectedSongUrl || this.job.song.songUrl || "";
    return html`
      <div class="contentful-preview">
        <div class="song-review-header">
          <div>
            <div><strong>Status</strong></div>
            <div>${this.job.song.status}</div>
          </div>
          <a class="link-chip" href="https://suno.com/create" target="_blank" rel="noreferrer">Open Suno create</a>
        </div>
        <div>Open Suno, then copy over the title, prompt, and lyrics from the fields below.</div>
        ${SONG_REVIEW_FIELDS.map((field) => this.renderSongReviewField(field.key, field.label, field.multiline))}
        <label>
          <span>Final song URL</span>
          <input .value=${songUrl} @input=${this.handleSongUrlInput} placeholder="https://..." />
        </label>
        ${songUrl ? this.renderSongEmbed(songUrl) : html``}
        <div class="actions">
          <button ?disabled=${!(this.selectedSongUrl || this.job.song.songUrl)} @click=${this.handleSelectSong}>
            Approve selected song
          </button>
        </div>
      </div>
    `;
  }

  private renderSongEmbed(songUrl: string, heading = "Song preview"): TemplateResult {
    return html`
      <div class="song-embed">
        <div><strong>${heading}</strong></div>
        <iframe
          src=${songUrl}
          width="760"
          height="240"
          frameborder="0"
          allow="autoplay; encrypted-media; fullscreen"
          allowfullscreen
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          title="Song preview">
          <a href=${songUrl} target="_blank" rel="noreferrer">Listen on Suno</a>
        </iframe>
      </div>
    `;
  }

  private renderSongReviewField(key: ArtifactKey, label: string, multiline: boolean): TemplateResult {
    const value = this.resolveSongReviewEditorValue(key);
    const copyLabel = this.copiedSongField === key ? "Copied" : "Copy";
    const saveLabel = this.savingSongFields[key] ? "Saving..." : "Save";
    const placeholder = `${label} not ready`;

    return html`
      <section class="song-review-field">
        <div class="song-review-field-header">
          <strong>${label}</strong>
          <div class="song-review-field-actions">
            <button class="secondary" ?disabled=${!value} @click=${() => this.handleCopySongField(key, value)}>
              ${copyIcon} ${copyLabel}
            </button>
            <button
              ?disabled=${this.savingSongFields[key] || value.trim().length === 0}
              @click=${() => this.handleSaveSongField(key, label)}>
              ${saveLabel}
            </button>
          </div>
        </div>
        ${multiline
          ? html`
              <textarea
                .value=${value}
                placeholder=${placeholder}
                @input=${(event: Event) => this.handleSongReviewEditorInput(key, event)}></textarea>
            `
          : html`
              <input
                .value=${value}
                placeholder=${placeholder}
                @input=${(event: Event) => this.handleSongReviewEditorInput(key, event)} />
            `}
      </section>
    `;
  }

  private renderNotion(): TemplateResult {
    if (!this.job) {
      return html``;
    }
    const notionStage = this.job.stages.find((stage) => stage.name === "notion") ?? null;
    const notionFailed = this.job.notion.status === "failed" || notionStage?.status === "failed";
    const notionSending = this.sendingToNotion;
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
        <div>${notionFailed ? "failed" : this.job.notion.status}</div>
        ${notionStage?.message
          ? html`
              <div class="stage-message">${notionStage.message}</div>
            `
          : html``}
        <button ?disabled=${notionSending || !this.job.contentful.entryUrl} @click=${this.handleSendToNotion}>
          ${notionSending
            ? "Sending..."
            : notionFailed || this.job.notion.status === "sending"
              ? "Retry sending DM notes to Notion"
              : "Send DM notes to Notion"}
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

  private handleOpenImageLightbox(src: string, alt: string): void {
    this.lightboxImage = { src, alt };
    window.document.body.style.overflow = "hidden";
  }

  private handleCloseImageLightbox = (): void => {
    this.lightboxImage = null;
    window.document.body.style.overflow = "auto";
  };

  private handleImageLightboxDialogClick = (event: Event): void => {
    event.stopPropagation();
  };

  private handleSongReviewEditorInput(key: ArtifactKey, event: Event): void {
    const target = event.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    this.songReviewEditors = {
      ...this.songReviewEditors,
      [key]: target.value,
    };
  }

  private handleContentfulEditorInput(key: ArtifactKey, event: Event): void {
    const target = event.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    this.contentfulEditors = {
      ...this.contentfulEditors,
      [key]: target.value,
    };
  }

  private async handleCopySongField(key: ArtifactKey, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedSongField = key;
      dispatch(this, SuccessEvent("Copied to clipboard."));
    } catch {
      dispatch(this, WarningEvent("Unable to copy to clipboard."));
    }
  }

  private async handleSaveSongField(key: ArtifactKey, label: string): Promise<void> {
    const text = this.resolveSongReviewEditorValue(key).trim();
    if (!text) {
      dispatch(this, WarningEvent(`${label} cannot be empty.`));
      return;
    }

    this.savingSongFields = {
      ...this.savingSongFields,
      [key]: true,
    };

    try {
      const detail = await updateArtifactService.fetch({
        jobId: this.params.jobId,
        artifactKey: key,
        text,
      });
      this.applyArtifactDetail(detail);
      this.songReviewEditors = {
        ...this.songReviewEditors,
        [key]: detail.activeVersion?.text ?? text,
      };
      dispatch(this, SuccessEvent(`${label} saved.`));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : `Unable to save ${label}.`));
    } finally {
      this.savingSongFields = {
        ...this.savingSongFields,
        [key]: false,
      };
    }
  }

  private async handleSaveContentfulField(key: ArtifactKey, label: string): Promise<void> {
    const text = this.resolveContentfulEditorValue(key).trim();
    if (!text) {
      dispatch(this, WarningEvent(`${label} cannot be empty.`));
      return;
    }

    this.savingContentfulFields = {
      ...this.savingContentfulFields,
      [key]: true,
    };

    try {
      const detail = await updateArtifactService.fetch({
        jobId: this.params.jobId,
        artifactKey: key,
        text,
      });
      this.applyArtifactDetail(detail);
      this.contentfulEditors = {
        ...this.contentfulEditors,
        [key]: detail.activeVersion?.text ?? text,
      };
      dispatch(this, SuccessEvent(`${label} saved.`));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : `Unable to save ${label}.`));
    } finally {
      this.savingContentfulFields = {
        ...this.savingContentfulFields,
        [key]: false,
      };
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

  private async handleRejectImage(imageId: string): Promise<void> {
    try {
      this.job = await rejectJobImageService.fetch({ jobId: this.params.jobId, imageId });
      dispatch(this, SuccessEvent("Image rejected."));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to reject the image."));
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
    this.sendingToNotion = true;
    try {
      this.job = await sendJobToNotionService.fetch({ jobId: this.params.jobId });
      dispatch(this, SuccessEvent("DM notes sent to Notion."));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to send DM notes to Notion."));
    } finally {
      this.sendingToNotion = false;
    }
  }

  private handleRestartFromFailed = async (): Promise<void> => {
    this.restarting = true;
    try {
      this.job = await restartJobService.fetch({ jobId: this.params.jobId });
      dispatch(this, SuccessEvent("Job restarted from the failed stage."));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to restart the failed job."));
    } finally {
      this.restarting = false;
    }
  };

  private handleForceRestartStage = async (stageName: JobStageName): Promise<void> => {
    this.restartingStageName = stageName;
    try {
      this.job = await restartJobStageService.fetch({ jobId: this.params.jobId, stageName });
      dispatch(this, SuccessEvent(`${stageName} force restarted.`));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to force restart the stage."));
    } finally {
      this.restartingStageName = null;
    }
  };

  private handleToggleArchive = async (): Promise<void> => {
    this.updatingArchiveState = true;
    try {
      this.job = this.job?.archivedAt
        ? await restoreJobService.fetch({ jobId: this.params.jobId })
        : await archiveJobService.fetch({ jobId: this.params.jobId });
      dispatch(this, SuccessEvent(this.job?.archivedAt ? "Job archived." : "Job restored."));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to update archive state."));
    } finally {
      this.updatingArchiveState = false;
    }
  };

  private resolveSongReviewEditorValue(key: ArtifactKey): string {
    return this.songReviewEditors[key] ?? this.resolveArtifactText(key);
  }

  private resolveContentfulEditorValue(key: ArtifactKey): string {
    return this.contentfulEditors[key] ?? this.resolveArtifactText(key);
  }

  private resolveApprovedImages(): JobDetail["image"]["generatedAssets"] {
    return this.job?.image.generatedAssets.filter((asset) => asset.approvedAt && !asset.rejectedAt) ?? [];
  }

  private resolveArtifactText(key: ArtifactKey): string {
    if (!this.job) {
      return "";
    }

    const artifact = this.job.artifacts.find((entry) => entry.key === key);
    const versions = this.job.artifactVersions[key] ?? [];
    const activeVersion = artifact?.activeVersionId
      ? versions.find((version) => version.id === artifact.activeVersionId)
      : null;
    return activeVersion?.text ?? versions.find((version) => !version.deletedAt)?.text ?? "";
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
