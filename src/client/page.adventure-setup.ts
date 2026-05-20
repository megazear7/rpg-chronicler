import { css, html, TemplateResult } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { createJobService } from "../shared/service.create-job.js";
import { getContentfulCatalogService } from "../shared/service.get-contentful-catalog.js";
import { ContentfulCatalog } from "../shared/type.contentful-context.js";
import { dispatch } from "./util.events.js";
import { SuccessEvent } from "./event.success.js";
import { WarningEvent } from "./event.warning.js";
import { NavigationEvent } from "./event.navigation.js";
import { normalizeInstructionConfig } from "../shared/util.instructions.js";
import { updateAppConfigService } from "../shared/service.update-app-config.js";
import { buildSelectionPreviewText, normalizeSubmissionSelection } from "../shared/util.contentful-context.js";
import { leftArrowIcon } from "./icons.js";
import "./component.instructions-editor.js";
import "./component.contentful-selection-editor.js";
import { RpgChroniclerInstructionsEditor } from "./component.instructions-editor.js";
import { RpgChroniclerContentfulSelectionEditor } from "./component.contentful-selection-editor.js";
import { clearPendingFile, getPendingFile } from "./util.pending-file.js";

@customElement("rpg-chronicler-adventure-setup-page")
export class RpgChroniclerAdventureSetupPage extends RpgChroniclerAppProvider {
  @state() private pendingFile: File | null = null;
  @state() private submitting = false;
  @state() private catalog: ContentfulCatalog | null = null;
  @state() private selectionDraft = normalizeSubmissionSelection();
  @query("rpg-chronicler-instructions-editor") private instructionsEditor?: RpgChroniclerInstructionsEditor;
  @query("rpg-chronicler-contentful-selection-editor") private selectionEditor?: RpgChroniclerContentfulSelectionEditor;

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
        display: grid;
        gap: var(--size-medium);
      }

      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: var(--font-small);
        opacity: 0.7;
      }

      .file-chip {
        display: inline-flex;
        align-items: center;
        gap: var(--size-small);
        padding: var(--size-small) var(--size-medium);
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-accent) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
        font-size: var(--font-small);
        color: var(--color-accent);
        width: fit-content;
      }

      .actions {
        display: flex;
        gap: var(--size-medium);
        flex-wrap: wrap;
        align-items: center;
        margin-top: var(--size-small);
      }

      .browser-link {
        width: fit-content;
        padding: var(--size-medium) var(--size-large);
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-primary-background) 88%, black);
        box-shadow: var(--shadow-normal);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
        text-decoration: none;
        color: var(--color-primary-text);
        cursor: pointer;
        transition: var(--transition-all);
      }

      .browser-link:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-hover);
        border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
      }

      button {
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-primary-background) 65%, transparent);
        color: var(--color-primary-text);
        padding: var(--size-medium) var(--size-large);
        cursor: pointer;
        font-size: var(--font-medium);
        box-shadow: var(--shadow-normal);
        transition: var(--transition-all);
      }

      button:hover:not([disabled]) {
        transform: translateY(-1px);
        box-shadow: var(--shadow-hover);
        border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
      }

      button[disabled] {
        cursor: not-allowed;
        opacity: 0.6;
      }

      @media (max-width: 720px) {
        main {
          padding: var(--size-medium);
        }
      }
    `,
  ];

  override render(): TemplateResult {
    if (!this.pendingFile) {
      return html``;
    }

    const previewContextText = buildSelectionPreviewText(this.catalog, this.selectionDraft);

    return html`
      <main>
        <section class="panel">
          <div><a href="/">${leftArrowIcon} Back to home</a></div>
          <h1>Set up adventure</h1>
          <div class="file-chip">${this.pendingFile.name}</div>
        </section>

        <section class="panel">
          <div class="eyebrow">Step 1</div>
          <h2>Configure the adventure context</h2>
          <p>These options come directly from Contentful and prefill from your workflow configuration defaults.</p>
          <rpg-chronicler-contentful-selection-editor
            .catalog=${this.catalog}
            .selection=${this.selectionDraft}
            .searchBeforeListingQueries=${["locations", "npcs", "previousEvents"]}
            @selection-change=${this.handleSelectionChange}>
          </rpg-chronicler-contentful-selection-editor>
        </section>

        <section class="panel">
          <div class="eyebrow">Step 2</div>
          <h2>Adjust instructions before creating the job</h2>
          <p>The opening paragraph is locked here. You can edit it from the workflow configuration page.</p>
          <rpg-chronicler-instructions-editor
            .config=${normalizeInstructionConfig(this.appContext.app?.instructions)}
            .previewContextText=${previewContextText}
            .editableIntro=${false}></rpg-chronicler-instructions-editor>
          <div class="actions">
            <a class="browser-link" href="/instructions">Open workflow configuration</a>
            <button ?disabled=${this.submitting} @click=${this.handleSubmit}>
              ${this.submitting ? "Creating job..." : "Approve setup and create job"}
            </button>
          </div>
        </section>
      </main>
    `;
  }

  override async load(): Promise<void> {
    await super.load();
    const file = getPendingFile();
    if (!file) {
      dispatch(this, NavigationEvent({ path: "/" }));
      return;
    }
    this.pendingFile = file;
    this.catalog = await getContentfulCatalogService.fetch();
    this.selectionDraft = normalizeSubmissionSelection(this.appContext.app?.submissionDefaults);
  }

  private handleSelectionChange = (event: CustomEvent): void => {
    this.selectionDraft = normalizeSubmissionSelection(event.detail);
  };

  private async handleSubmit(): Promise<void> {
    if (!this.pendingFile) {
      dispatch(this, WarningEvent("No audio file selected."));
      return;
    }
    if (!this.appContext.app || !this.instructionsEditor || !this.selectionEditor) {
      dispatch(this, WarningEvent("Instruction configuration is not ready yet."));
      return;
    }

    const appConfig = this.appContext.app;
    this.submitting = true;

    try {
      const submission = this.selectionEditor.getValue();
      const instructions = this.instructionsEditor.getValue();
      const updatedAppConfig = await updateAppConfigService.fetch({
        ...appConfig,
        instructions,
        latestSubmission: submission,
      });
      this.appContext = {
        ...this.appContext,
        app: updatedAppConfig,
      };
      const instructionsText = this.instructionsEditor.getComputedInstructions();
      const job = await createJobService.fetch({
        file: this.pendingFile,
        instructionsText,
        submission,
      });
      clearPendingFile();
      dispatch(this, SuccessEvent("Job created and processing started."));
      dispatch(this, NavigationEvent({ path: `/jobs/${job.id}` }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit job.";
      dispatch(this, WarningEvent(message));
    } finally {
      this.submitting = false;
    }
  }
}
