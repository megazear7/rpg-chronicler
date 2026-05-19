import { css, html, TemplateResult } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { globalStyles } from "./styles.global.js";
import { leftArrowIcon } from "./icons.js";
import { getContentfulCatalogService } from "../shared/service.get-contentful-catalog.js";
import { ContentfulCatalog } from "../shared/type.contentful-context.js";
import { normalizeInstructionConfig } from "../shared/util.instructions.js";
import { buildSelectionPreviewText, normalizeSubmissionSelection } from "../shared/util.contentful-context.js";
import { updateAppConfigService } from "../shared/service.update-app-config.js";
import { dispatch } from "./util.events.js";
import { SuccessEvent } from "./event.success.js";
import { WarningEvent } from "./event.warning.js";
import "./component.instructions-editor.js";
import "./component.contentful-selection-editor.js";
import { RpgChroniclerInstructionsEditor } from "./component.instructions-editor.js";
import { RpgChroniclerContentfulSelectionEditor } from "./component.contentful-selection-editor.js";

@customElement("rpg-chronicler-instructions-page")
export class RpgChroniclerInstructionsPage extends RpgChroniclerAppProvider {
  @query("rpg-chronicler-instructions-editor") private editor?: RpgChroniclerInstructionsEditor;
  @query("rpg-chronicler-contentful-selection-editor") private selectionEditor?: RpgChroniclerContentfulSelectionEditor;
  @state() private saving = false;
  @state() private catalog: ContentfulCatalog | null = null;
  @state() private selectionDraft = normalizeSubmissionSelection();

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

      .stack {
        display: grid;
        gap: var(--size-large);
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
    const previewContextText = this.buildPreviewContextText();
    return html`
      <main>
        <section class="panel">
          <a href="/">${leftArrowIcon} Home</a>
          <h1>Workflow Configuration</h1>
          <p>Manage the reusable writing instructions and the default adventure context used before a newer submission has been recorded.</p>
        </section>

        <div class="stack">
          <rpg-chronicler-contentful-selection-editor
            .catalog=${this.catalog}
            .selection=${this.selectionDraft}
            .searchBeforeListingQueries=${["locations", "npcs", "previousEvents"]}
            @selection-change=${this.handleSelectionChange}>
          </rpg-chronicler-contentful-selection-editor>

          <rpg-chronicler-instructions-editor
            .config=${normalizeInstructionConfig(this.appContext.app?.instructions)}
            .previewContextText=${previewContextText}
            .editableIntro=${true}></rpg-chronicler-instructions-editor>
        </div>

        <section class="panel actions">
          <button ?disabled=${this.saving} @click=${this.handleSave}>${this.saving ? "Saving..." : "Save workflow defaults"}</button>
        </section>
      </main>
    `;
  }

  override async load(): Promise<void> {
    await super.load();
    this.catalog = await getContentfulCatalogService.fetch();
    this.selectionDraft = normalizeSubmissionSelection(this.appContext.app?.submissionDefaults);
  }

  private handleSelectionChange = (event: CustomEvent): void => {
    this.selectionDraft = normalizeSubmissionSelection(event.detail);
  };

  private buildPreviewContextText(): string {
    return buildSelectionPreviewText(this.catalog, this.selectionDraft);
  }

  private handleSave = async (): Promise<void> => {
    if (!this.appContext.app || !this.editor || !this.selectionEditor) {
      dispatch(this, WarningEvent("App configuration is not ready yet."));
      return;
    }

    this.saving = true;
    try {
      const updated = await updateAppConfigService.fetch({
        ...this.appContext.app,
        instructions: this.editor.getValue(),
        submissionDefaults: this.selectionEditor.getValue(),
      });
      this.appContext = {
        ...this.appContext,
        app: updated,
      };
      dispatch(this, SuccessEvent("Workflow defaults saved."));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to save instruction configuration."));
    } finally {
      this.saving = false;
    }
  };
}