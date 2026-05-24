import { css, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { globalStyles } from "./styles.global.js";
import { leftArrowIcon } from "./icons.js";
import { updateAppConfigService } from "../shared/service.update-app-config.js";
import { dispatch } from "./util.events.js";
import { SuccessEvent } from "./event.success.js";
import { WarningEvent } from "./event.warning.js";
import { AppSettings, DEFAULT_APP_SETTINGS } from "../shared/type.app-settings.js";

@customElement("rpg-chronicler-app-settings-page")
export class RpgChroniclerAppSettingsPage extends RpgChroniclerAppProvider {
  @state() private saving = false;
  @state() private draft: AppSettings = DEFAULT_APP_SETTINGS;

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
          radial-gradient(
            circle at top right,
            color-mix(in srgb, var(--color-accent) 18%, transparent),
            transparent 38%
          ),
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--color-secondary-surface) 96%, white),
            var(--color-secondary-surface)
          );
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

      h2 {
        margin: 0 0 var(--size-medium) 0;
        font-size: 1.1rem;
      }

      label {
        display: grid;
        gap: var(--size-small);
        margin-bottom: var(--size-medium);
      }

      label span {
        font-size: 0.875rem;
        opacity: 0.75;
      }

      input[type="number"],
      textarea {
        background: color-mix(in srgb, var(--color-primary-background) 80%, transparent);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 15%, transparent);
        border-radius: var(--size-small);
        color: var(--color-primary-text);
        padding: var(--size-small) var(--size-medium);
        font-family: inherit;
        font-size: 0.9rem;
        width: 100%;
        box-sizing: border-box;
      }

      textarea {
        min-height: 120px;
        resize: vertical;
      }

      .modifiers-list {
        display: grid;
        gap: var(--size-small);
      }

      .modifier-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: var(--size-small);
        align-items: center;
      }

      .modifier-row input {
        background: color-mix(in srgb, var(--color-primary-background) 80%, transparent);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 15%, transparent);
        border-radius: var(--size-small);
        color: var(--color-primary-text);
        padding: var(--size-small) var(--size-medium);
        font-family: inherit;
        font-size: 0.9rem;
        width: 100%;
        box-sizing: border-box;
      }

      .remove-btn {
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-primary-background) 65%, transparent);
        color: var(--color-primary-text);
        padding: var(--size-small) var(--size-medium);
        cursor: pointer;
        white-space: nowrap;
        font-size: 0.85rem;
      }

      .add-btn {
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-primary-background) 65%, transparent);
        color: var(--color-primary-text);
        padding: var(--size-small) var(--size-medium);
        cursor: pointer;
        font-size: 0.85rem;
        margin-top: var(--size-small);
      }
    `,
  ];

  override render(): TemplateResult {
    return html`
      <main>
        <section>
          <a href="/">${leftArrowIcon} Home</a>
          <h1>App Settings</h1>
          <p>Configure the processing parameters, timing, and song generation settings used during job runs.</p>
        </section>

        <div class="stack">
          <section class="panel">
            <h2>Timing &amp; Word Count</h2>
            <label>
              <span>Words per minute of audio</span>
              <input
                type="number"
                min="1"
                .value=${String(this.draft.wordsPerMinuteOfAudio)}
                @input=${(e: Event) => this.handleNumberInput(e, "wordsPerMinuteOfAudio")} />
            </label>
            <label>
              <span>Minimum words</span>
              <input
                type="number"
                min="1"
                .value=${String(this.draft.minimumWords)}
                @input=${(e: Event) => this.handleNumberInput(e, "minimumWords")} />
            </label>
            <label>
              <span>Maximum words</span>
              <input
                type="number"
                min="1"
                .value=${String(this.draft.maximumWords)}
                @input=${(e: Event) => this.handleNumberInput(e, "maximumWords")} />
            </label>
            <label>
              <span>Max direct audio seconds (audio longer than this will be split into parts)</span>
              <input
                type="number"
                min="1"
                .value=${String(this.draft.maxDirectAudioSeconds)}
                @input=${(e: Event) => this.handleNumberInput(e, "maxDirectAudioSeconds")} />
            </label>
          </section>

          <section class="panel">
            <h2>Image Generation</h2>
            <label>
              <span>Image candidates per prompt</span>
              <input
                type="number"
                min="1"
                .value=${String(this.draft.imageCandidatesPerPrompt)}
                @input=${(e: Event) => this.handleNumberInput(e, "imageCandidatesPerPrompt")} />
            </label>
          </section>

          <section class="panel">
            <h2>Song Generation</h2>
            <label>
              <span>Default song example (used as the base style for generated song prompts)</span>
              <textarea
                .value=${this.draft.defaultSongExample}
                @input=${(e: Event) => this.handleTextInput(e, "defaultSongExample")}></textarea>
            </label>
            <div>
              <span style="font-size: 0.875rem; opacity: 0.75;">
                Song style modifiers (one randomly selected per job)
              </span>
              <div class="modifiers-list">
                ${this.draft.songModifiers.map(
                  (modifier, index) => html`
                    <div class="modifier-row">
                      <input
                        type="text"
                        .value=${modifier}
                        @input=${(e: Event) => this.handleModifierInput(e, index)} />
                      <button class="remove-btn" @click=${() => this.removeModifier(index)}>Remove</button>
                    </div>
                  `,
                )}
              </div>
              <button class="add-btn" @click=${this.addModifier}>+ Add modifier</button>
            </div>
          </section>
        </div>

        <section class="panel actions">
          <button ?disabled=${this.saving} @click=${this.handleSave}>
            ${this.saving ? "Saving..." : "Save settings"}
          </button>
        </section>
      </main>
    `;
  }

  override async load(): Promise<void> {
    await super.load();
    this.draft = AppSettings.parse(this.appContext.app?.settings ?? {});
  }

  private handleNumberInput(
    e: Event,
    field: keyof Pick<
      AppSettings,
      "wordsPerMinuteOfAudio" | "minimumWords" | "maximumWords" | "maxDirectAudioSeconds" | "imageCandidatesPerPrompt"
    >,
  ): void {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    if (!Number.isNaN(value) && value >= 1) {
      this.draft = { ...this.draft, [field]: value };
    }
  }

  private handleTextInput(e: Event, field: keyof Pick<AppSettings, "defaultSongExample">): void {
    const value = (e.target as HTMLTextAreaElement).value;
    this.draft = { ...this.draft, [field]: value };
  }

  private handleModifierInput(e: Event, index: number): void {
    const value = (e.target as HTMLInputElement).value;
    const updated = [...this.draft.songModifiers];
    updated[index] = value;
    this.draft = { ...this.draft, songModifiers: updated };
  }

  private addModifier(): void {
    this.draft = { ...this.draft, songModifiers: [...this.draft.songModifiers, ""] };
  }

  private removeModifier(index: number): void {
    const updated = this.draft.songModifiers.filter((_, i) => i !== index);
    this.draft = { ...this.draft, songModifiers: updated };
  }

  private handleSave = async (): Promise<void> => {
    if (!this.appContext.app) {
      dispatch(this, WarningEvent("App configuration is not ready yet."));
      return;
    }

    const parseResult = AppSettings.safeParse(this.draft);
    if (!parseResult.success) {
      dispatch(this, WarningEvent("Some settings are invalid. Please check the form and try again."));
      return;
    }

    this.saving = true;
    try {
      const updated = await updateAppConfigService.fetch({
        ...this.appContext.app,
        settings: parseResult.data,
      });
      this.appContext = {
        ...this.appContext,
        app: updated,
      };
      dispatch(this, SuccessEvent("App settings saved."));
    } catch (error) {
      dispatch(this, WarningEvent(error instanceof Error ? error.message : "Unable to save app settings."));
    } finally {
      this.saving = false;
    }
  };
}
