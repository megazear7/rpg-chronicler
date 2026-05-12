import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { globalStyles } from "./styles.global.js";

@customElement("rpg-chronicler-tooltip")
export class RpgChroniclerTooltip extends LitElement {
  static override styles = [
    globalStyles,
    css`
      :host {
        position: relative;
        display: inline-block;
      }

      .trigger {
        display: inline-block;
      }

      .tooltip {
        position: fixed;
        max-width: var(--size-7x);
        text-align: center;
        background-color: var(--color-secondary-surface);
        color: var(--color-primary-text);
        padding: var(--size-small) var(--size-medium);
        border-radius: var(--radius-medium);
        box-shadow: var(--shadow-hover);
        font-size: var(--font-small);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: all 350ms ease-in-out;
        border: 1px solid var(--color-secondary-text);
        pointer-events: none;
      }

      .tooltip::after {
        content: "";
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-top-color: var(--color-secondary-surface);
      }

      .tooltip.visible {
        opacity: 1;
        visibility: visible;
      }

      .tooltip.fade-out {
        opacity: 0;
        visibility: hidden;
        transform: translateX(-50%) translateY(10px);
      }
    `,
  ];

  @property()
  content: string = "";

  @property({ type: Boolean })
  visible: boolean = false;

  @property({ type: Number })
  offsetY: number = 0;

  @query(".trigger")
  private triggerElement!: HTMLElement;

  @query(".tooltip")
  private tooltipElement!: HTMLElement;

  private showTimeout?: number;
  private hideTimeout?: number;

  private handleMouseEnter(): void {
    this.clearTimeouts();
    this.showTimeout = window.setTimeout(() => {
      this.visible = true;
      this.requestUpdate();
      // Position after render
      requestAnimationFrame(() => {
        this.updatePosition();
      });
    }, 350);
  }

  private handleMouseLeave(): void {
    this.clearTimeouts();
    if (this.visible) {
      this.hideTimeout = window.setTimeout(() => {
        this.visible = false;
        this.requestUpdate();
      }, 150);
    } else {
      this.visible = false;
      this.requestUpdate();
    }
  }

  private updatePosition(): void {
    if (!this.triggerElement || !this.tooltipElement) return;

    const rect = this.triggerElement.getBoundingClientRect();

    // Position above the trigger, centered horizontally
    const top = rect.top - this.offsetY; // Estimate tooltip height + gap
    const left = rect.left + rect.width / 2 - 75; // Half of 150px width

    this.tooltipElement.style.top = `${Math.max(10, top)}px`; // Keep it on screen
    this.tooltipElement.style.left = `${Math.max(10, left)}px`; // Keep it on screen
  }

  private clearTimeouts(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = undefined;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.clearTimeouts();
  }

  override render(): TemplateResult {
    return html`
      <span class="trigger" @mouseenter=${this.handleMouseEnter} @mouseleave=${this.handleMouseLeave}>
        <slot></slot>
      </span>
      <div class="tooltip ${this.visible ? "visible" : ""}" style="position: fixed;">${this.content}</div>
    `;
  }
}
