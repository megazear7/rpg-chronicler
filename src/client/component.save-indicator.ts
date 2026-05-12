import { html, css, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { checkIcon } from "./icons.js";

@customElement("rpg-chronicler-save-indicator")
export class RpgChroniclerSaveIndicator extends LitElement {
  static override styles = css`
    :host {
      position: fixed;
      top: var(--size-large);
      right: var(--size-large);
      z-index: 10001;
      pointer-events: none;
    }

    .indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--size-large);
      height: var(--size-large);
      background-color: var(--color-success);
      border-radius: 50%;
      opacity: 0;
      transform: scale(0.3);
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      box-shadow: var(--inverse-hover);
    }

    .indicator.visible {
      opacity: 1;
      transform: scale(1);
    }

    .indicator svg {
      width: var(--size-medium);
      height: var(--size-medium);
      color: white;
      stroke-width: 4;
    }

    .indicator.visible svg {
      animation: checkmark 0.8s ease-in-out;
    }

    @keyframes checkmark {
      0% {
        transform: scale(0) rotate(-45deg);
        opacity: 0;
      }
      50% {
        transform: scale(1.1) rotate(-45deg);
        opacity: 1;
      }
      100% {
        transform: scale(1) rotate(0deg);
        opacity: 1;
      }
    }
  `;

  @property({ type: Boolean })
  visible = false;

  private hideTimeout?: number;

  override connectedCallback(): void {
    super.connectedCallback();
    // Listen for save events - you might need to adjust this based on your event system
    document.addEventListener("book-saved", this.show.bind(this));
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("book-saved", this.show.bind(this));
    if (this.hideTimeout) {
      window.clearTimeout(this.hideTimeout);
    }
  }

  show(): void {
    this.visible = true;
    this.requestUpdate();

    // Hide after 2 seconds
    if (this.hideTimeout) {
      window.clearTimeout(this.hideTimeout);
    }

    this.hideTimeout = window.setTimeout(() => {
      this.visible = false;
      this.requestUpdate();
    }, 2000);
  }

  override render(): TemplateResult {
    return html`
      <div class="indicator ${this.visible ? "visible" : ""}">${checkIcon}</div>
    `;
  }
}
