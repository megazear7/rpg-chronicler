import { css, html, TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";
import { UsageSummary } from "../shared/type.prompt.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { leftArrowIcon } from "./icons.js";

@customElement("rpg-chronicler-usage-page")
export class RpgChroniclerUsagePage extends RpgChroniclerAppProvider {
  static override styles = [
    globalStyles,
    css`
      main {
        padding: var(--size-large);
        display: grid;
        gap: var(--size-large);
      }

      .hero,
      .panel,
      .usage-card {
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
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
      }

      .hero {
        display: grid;
        gap: var(--size-medium);
      }

      .usage-grid,
      .metric-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: var(--size-medium);
      }

      .usage-card {
        display: grid;
        gap: var(--size-medium);
      }

      .metric {
        display: grid;
        gap: 0.25rem;
      }

      .metric span {
        font-size: var(--font-small);
        opacity: 0.75;
      }

      .metric strong {
        font-size: var(--font-large);
      }
    `,
  ];

  override render(): TemplateResult {
    const usage = this.appContext.app?.usage;
    return html`
      <main>
        <section class="hero">
          <a href="/">${leftArrowIcon} Home</a>
          <h1>Usage</h1>
          <p>Application-wide token usage and calculated cost across text, audio, and image generation.</p>
          ${usage
            ? this.renderSummary(usage.total)
            : html`
                <p>Loading usage...</p>
              `}
        </section>

        ${usage
          ? html`
              <section class="panel">
                <h2>By model</h2>
                <div class="usage-grid">
                  ${this.renderUsageCard("Text", usage.text)} ${this.renderUsageCard("Audio", usage.audio)}
                  ${this.renderUsageCard("Image", usage.image)}
                </div>
              </section>
            `
          : html``}
      </main>
    `;
  }

  private renderUsageCard(label: string, usage: UsageSummary): TemplateResult {
    return html`
      <article class="usage-card">
        <h2>${label}</h2>
        ${this.renderSummary(usage)}
      </article>
    `;
  }

  private renderSummary(usage: UsageSummary): TemplateResult {
    return html`
      <div class="metric-grid">
        <div class="metric">
          <span>Input tokens</span>
          <strong>${this.formatNumber(usage.inputTokens)}</strong>
        </div>
        <div class="metric">
          <span>Output tokens</span>
          <strong>${this.formatNumber(usage.outputTokens)}</strong>
        </div>
        <div class="metric">
          <span>Total tokens</span>
          <strong>${this.formatNumber(usage.totalTokens)}</strong>
        </div>
        <div class="metric">
          <span>Total cost</span>
          <strong>${this.formatCurrency(usage.totalCost)}</strong>
        </div>
      </div>
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
}
