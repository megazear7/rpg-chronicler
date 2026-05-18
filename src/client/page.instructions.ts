import { css, html, TemplateResult } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { globalStyles } from "./styles.global.js";
import { leftArrowIcon } from "./icons.js";
import { normalizeInstructionConfig } from "../shared/util.instructions.js";
import { updateAppConfigService } from "../shared/service.update-app-config.js";
import { dispatch } from "./util.events.js";
import { SuccessEvent } from "./event.success.js";
import { WarningEvent } from "./event.warning.js";
import "./component.instructions-editor.js";
import { RpgChroniclerInstructionsEditor } from "./component.instructions-editor.js";

@customElement("rpg-chronicler-instructions-page")
export class RpgChroniclerInstructionsPage extends RpgChroniclerAppProvider {
  @query("rpg-chronicler-instructions-editor") private editor?: RpgChroniclerInstructionsEditor;
  @state() private saving = false;

  static override styles = [
    globalStyles,
    css`
      main {
        padding: var(--size-large);
        display: grid;
        gap: var(--size-large);
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

      .actions {
        display: flex;
        gap: var(--size-medium);
        flex-wrap: wrap;
        align-items: center;
      }

      button {
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-primary-background) 65%, transparent);
        color: var(--color-primary-text);
        padding: var(--size-medium) var(--size-large);
        cursor: pointer;
      }
    `,
  ];

  override render(): TemplateResult {
    return html`
      <main>
        <section class="panel">
          <a href="/">${leftArrowIcon} Home</a>
          <h1>Instructions Configuration</h1>
          <p>Manage the editable instruction data used to prepare each new job.</p>
        </section>

        <rpg-chronicler-instructions-editor
          .config=${normalizeInstructionConfig(this.appContext.app?.instructions)}
          .editableIntro=${true}></rpg-chronicler-instructions-editor>

        <section class="panel actions">
          <button ?disabled=${this.saving} @click=${this.handleSave}>${this.saving ? "Saving..." : "Save instruction configuration"}</button>
        </section>
      </main>
    `;
  }

  private handleSave = async (): Promise<void> => {
    if (!this.appContext.app || !this.editor) {
      dispatch(this, WarningEvent("App configuration is not ready yet."));
      return;
    }

    this.saving = true;
    try {
      const updated = await updateAppConfigService.fetch({
        ...this.appContext.app,
        instructions: this.editor.getValue(),
      });
      this.appContext = {
        ...this.appContext,
        app: updated,
      };
      dispatch(this, SuccessEvent("Instruction configuration saved."));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to save instruction configuration."));
    } finally {
      this.saving = false;
    }
  };
}