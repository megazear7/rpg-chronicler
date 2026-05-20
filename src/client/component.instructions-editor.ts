import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { globalStyles } from "./styles.global.js";
import { DEFAULT_INSTRUCTION_CONFIG, InstructionConfig } from "../shared/type.instructions.js";
import { buildInstructionText, normalizeInstructionConfig } from "../shared/util.instructions.js";

function cloneConfig(config: InstructionConfig): InstructionConfig {
  return InstructionConfig.parse(JSON.parse(JSON.stringify(config)));
}

@customElement("rpg-chronicler-instructions-editor")
export class RpgChroniclerInstructionsEditor extends LitElement {
  @property({ attribute: false }) config: InstructionConfig = cloneConfig(DEFAULT_INSTRUCTION_CONFIG);
  @property({ type: Boolean }) editableIntro = false;
  @property({ type: String }) previewContextText = "";

  @state() private draft: InstructionConfig = cloneConfig(DEFAULT_INSTRUCTION_CONFIG);

  static override styles = [
    globalStyles,
    css`
      :host {
        display: grid;
        gap: var(--size-large);
      }

      .section,
      .preview {
        background: color-mix(in srgb, var(--color-secondary-surface) 92%, black);
        border-radius: 28px;
        padding: var(--size-large);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
        box-shadow: var(--shadow-normal);
      }

      .section {
        display: grid;
        gap: var(--size-medium);
      }

      .section-title {
        display: flex;
        justify-content: space-between;
        gap: var(--size-medium);
        flex-wrap: wrap;
        align-items: center;
      }

      label {
        display: grid;
        gap: var(--size-small);
      }

      textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 120px;
        resize: vertical;
        border-radius: 18px;
        padding: var(--size-medium);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        background: color-mix(in srgb, var(--color-primary-background) 72%, transparent);
        color: var(--color-primary-text);
        font: inherit;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 0.3rem 0.7rem;
        background: color-mix(in srgb, var(--color-primary-text) 10%, transparent);
        font-size: var(--font-small);
        width: fit-content;
      }

      .preview pre {
        white-space: pre-wrap;
        margin: 0;
        font: inherit;
        margin-top: var(--size-large);
      }

      .readonly-intro {
        white-space: pre-wrap;
      }
    `,
  ];

  override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("config")) {
      this.draft = cloneConfig(normalizeInstructionConfig(this.config));
    }
  }

  getValue(): InstructionConfig {
    return cloneConfig(this.draft);
  }

  getComputedInstructions(): string {
    return buildInstructionText(this.draft);
  }

  override render(): TemplateResult {
    const previewSections = [this.getComputedInstructions(), this.previewContextText.trim()].filter(
      (section) => section.length > 0,
    );

    return html`
      <section class="section">
        <div class="section-title">
          <div>
            <h3>Instructions Introduction</h3>
            <div class="pill">${this.editableIntro ? "Editable here" : "Managed on the instructions page"}</div>
          </div>
        </div>
        ${this.editableIntro
          ? html`
              <label>
                <span>Opening paragraph</span>
                <textarea .value=${this.draft.intro} @input=${this.handleIntroInput}></textarea>
              </label>
            `
          : html`
              <div class="readonly-intro">${this.draft.intro}</div>
            `}
      </section>

      <section class="preview">
        <div class="section-title">
          <div>
            <h3>Computed Instructions Preview</h3>
            <div class="pill">Read-only review</div>
          </div>
        </div>
        <pre>${previewSections.join("\n\n")}</pre>
      </section>
    `;
  }

  private handleIntroInput = (event: Event): void => {
    const target = event.currentTarget as HTMLTextAreaElement;
    this.draft = normalizeInstructionConfig({
      ...this.draft,
      intro: target.value,
    });
  };
}
