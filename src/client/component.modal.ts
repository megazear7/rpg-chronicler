import { html, css, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { globalStyles } from "./styles.global";
import { dispatch, stopProp } from "./util.events";
import { ModelSubmitEvent } from "./event.modal-submit.js";
import { ModelOpeningEvent } from "./event.modal-opening.js";
import { wait } from "../shared/util.wait";
import { ModelClosingEvent } from "./event.modal-closing";
import { xIcon } from "./icons.js";

const ANIMATION_SPEED = 300;

@customElement("rpg-chronicler-modal")
export class RpgChroniclerModal extends LitElement {
  static override styles = [
    globalStyles,
    css`
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(5px);
        z-index: 1000;
        align-items: center;
        justify-content: center;
        display: none;
      }

      .modal-content {
        background: var(--color-secondary-surface);
        border-radius: var(--radius-large);
        box-shadow: var(--shadow-large);
        width: 40vw;
        max-height: 80vh;
        overflow-y: scroll;
        margin: 100px auto;
        position: relative;
        opacity: 0;
        transform: translateY(-20vh);
      }

      .modal-body {
        padding: 0 var(--size-xxl) var(--size-xxl) var(--size-xxl);
      }

      .modal-backdrop.visible .modal-content {
        opacity: 1;
        transform: none;
      }

      .modal-header {
        display: flex;
        justify-content: flex-end;
        padding: var(--size-medium) var(--size-small) 0 var(--size-small);
      }

      .close-button {
        color: var(--color-primary-text);
        transition: var(--transition-all);
      }

      .close-button:hover {
        color: var(--color-error);
      }

      .modal-backdrop.visible,
      .modal-backdrop.opening {
        display: flex;
      }

      .modal-backdrop.opening .modal-content {
        animation: slideDown ${ANIMATION_SPEED}ms forwards;
      }

      .modal-backdrop.closing .modal-content {
        animation: slideDown ${ANIMATION_SPEED}ms reverse;
      }

      @keyframes slideDown {
        from {
          transform: translateY(-20vh);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .modal-backdrop.opening {
        animation: fadeInBackdrop ${ANIMATION_SPEED}ms forwards;
      }

      .modal-backdrop.closing {
        animation: fadeInBackdrop ${ANIMATION_SPEED}ms reverse;
      }

      @keyframes fadeInBackdrop {
        from {
          background: rgba(0, 0, 0, 0);
        }
        to {
          background: rgba(0, 0, 0, 0.5);
        }
      }
    `,
  ];

  @property({ type: Boolean })
  visible = false;

  @property({ type: Boolean })
  opening = false;

  @property({ type: Boolean })
  closing = false;

  override render(): TemplateResult {
    return html`
      <slot name="open-button" @click=${this.openHandler()}></slot>
      <div class="${this.backdropClasses()}" @click=${this.closeHandler()}>
        <div class="modal-content" @click=${stopProp}>
          <div class="modal-header">
            <button class="close-button" @click=${this.closeHandler()}>${xIcon}</button>
          </div>
          <div class="modal-body">
            <slot name="body"></slot>
          </div>
        </div>
      </div>
    `;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("keydown", this.handleKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  backdropClasses(): ReturnType<typeof classMap> {
    return classMap({
      "modal-backdrop": true,
      overlay: true,
      opening: this.opening,
      closing: this.closing,
      visible: this.visible,
    });
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      this.close();
    }
  };

  private openHandler(): () => void {
    return () => {
      this.open();
    };
  }

  async open(): Promise<void> {
    this.opening = true;
    dispatch(this, ModelOpeningEvent());
    await wait(ANIMATION_SPEED);
    this.opening = false;
    this.visible = true;
    window.document.body.style.overflow = "hidden";
  }

  private closeHandler(): () => void {
    return (): void => {
      this.close();
    };
  }

  async close(): Promise<void> {
    this.closing = true;
    dispatch(this, ModelClosingEvent());
    await wait(ANIMATION_SPEED);
    this.closing = false;
    this.visible = false;
    window.document.body.style.overflow = "auto";
  }

  submit(): void {
    this.visible = false;
    dispatch(this, ModelSubmitEvent());
  }
}
