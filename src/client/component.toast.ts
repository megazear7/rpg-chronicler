import { html, css, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { globalStyles } from "./styles.global.js";
import { xIcon } from "./icons.js";
import z from "zod";

export const ToastType = z.enum(["error", "warning", "success", "info"]);
export type ToastType = z.infer<typeof ToastType>;

@customElement("rpg-chronicler-toast")
export class RpgChroniclerToast extends LitElement {
  static override styles = [
    globalStyles,
    css`
      :host {
        position: fixed;
        top: var(--size-large);
        right: var(--size-large);
        z-index: 10000;
        display: none;
        max-width: 30vw;
        padding: var(--size-medium);
        border-radius: var(--radius-medium);
        box-shadow: var(--shadow-active);
        color: var(--color-primary-text);
        font-size: var(--font-medium);
        transition: var(--transition-all);
      }

      :host([visible]) {
        display: block;
      }

      :host([type="error"]) {
        background-color: var(--color-error);
      }

      :host([type="warning"]) {
        background-color: var(--color-warning);
        color: #000;
      }

      :host([type="success"]) {
        background-color: var(--color-success);
      }

      :host([type="info"]) {
        background-color: var(--color-secondary-surface);
      }

      .toast-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .close-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        margin-left: var(--size-medium);
        color: inherit;
        opacity: 0.7;
        transition: opacity var(--time-normal);
      }

      .close-button:hover {
        opacity: 1;
      }
    `,
  ];

  @property({ type: String })
  message = "";

  @property({ type: String, reflect: true })
  type: ToastType = "info";

  @property({ type: Boolean, reflect: true })
  visible = false;

  override render(): TemplateResult {
    return html`
      <div class="toast-content">
        <div>${this.message}</div>
        <button class="close-button" @click=${this.handleClose}>${xIcon}</button>
      </div>
    `;
  }

  show(message: string, type: ToastType, duration: number = 5000): void {
    this.message = message;
    this.type = type;
    this.visible = true;
    setTimeout(() => {
      this.visible = false;
    }, duration);
  }

  private handleClose(): void {
    this.visible = false;
    this.dispatchEvent(new CustomEvent("close"));
  }
}
