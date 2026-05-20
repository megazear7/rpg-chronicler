import { css, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { parseRouteParams } from "../shared/util.route-params.js";
import { getJobService } from "../shared/service.get-job.js";
import { streamJobService } from "../shared/service.stream-job.js";
import { JobDetail, JobLogEntry } from "../shared/type.job.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { leftArrowIcon } from "./icons.js";

@customElement("rpg-chronicler-job-logs-page")
export class RpgChroniclerJobLogsPage extends RpgChroniclerAppProvider {
  private params = parseRouteParams("/jobs/:jobId/logs", window.location.pathname);
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

      .panel {
        background: linear-gradient(
          180deg,
          color-mix(in srgb, var(--color-secondary-surface) 95%, white),
          var(--color-secondary-surface)
        );
        border-radius: 32px;
        padding: var(--size-large);
        box-shadow: var(--shadow-hover);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 8%, transparent);
      }

      .log-list {
        display: grid;
        gap: var(--size-medium);
      }

      .log-item {
        border-radius: 24px;
        padding: var(--size-medium);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
        background: color-mix(in srgb, var(--color-primary-background) 42%, var(--color-secondary-surface));
        box-shadow: var(--shadow-normal);
      }

      .log-top {
        display: flex;
        justify-content: space-between;
        gap: var(--size-medium);
        flex-wrap: wrap;
        align-items: center;
        margin-bottom: var(--size-small);
      }

      .level {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        font-size: var(--font-small);
      }

      .level.info {
        background: color-mix(in srgb, var(--color-accent) 22%, transparent);
        color: var(--color-accent);
      }

      .level.success {
        background: color-mix(in srgb, var(--color-success) 22%, transparent);
        color: var(--color-success);
      }

      .level.warning {
        background: color-mix(in srgb, var(--color-warning) 28%, transparent);
        color: var(--color-warning);
      }

      .level.error {
        background: color-mix(in srgb, var(--color-error) 20%, transparent);
        color: #ff8f8f;
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
        <main><p>Loading logs...</p></main>
      `;
    }

    return html`
      <main>
        <section class="panel">
          <a href=${`/jobs/${this.params.jobId}`}>${leftArrowIcon} Back to job</a>
          <h1>${this.job.file}</h1>
          <p>Live processing log for quick diagnostics and status review.</p>
        </section>
        <section class="panel">
          <div class="log-list">
            ${this.job.logs.length === 0
              ? html`
                  <p>No logs yet.</p>
                `
              : this.job.logs.map((entry) => this.renderLog(entry))}
          </div>
        </section>
      </main>
    `;
  }

  private renderLog(entry: JobLogEntry): TemplateResult {
    return html`
      <article class="log-item">
        <div class="log-top">
          <span class=${`level ${entry.level}`}>${entry.level}</span>
          <small>${new Date(entry.createdAt).toLocaleString()}</small>
        </div>
        <div><strong>${entry.stage ?? "general"}</strong></div>
        <div>${entry.message}</div>
      </article>
    `;
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
