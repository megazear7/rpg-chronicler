import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { globalStyles } from "./styles.global.js";
import {
  DEFAULT_INSTRUCTION_CONFIG,
  InstructionCharacter,
  InstructionConfig,
  InstructionPlayer,
  InstructionStoryElement,
} from "../shared/type.instructions.js";
import { buildInstructionText, normalizeInstructionConfig } from "../shared/util.instructions.js";

function cloneConfig(config: InstructionConfig): InstructionConfig {
  return InstructionConfig.parse(JSON.parse(JSON.stringify(config)));
}

function includesQuery(values: Array<string | null | undefined>, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return true;
  }
  return values.some((value) => (value ?? "").toLowerCase().includes(normalizedQuery));
}

@customElement("rpg-chronicler-instructions-editor")
export class RpgChroniclerInstructionsEditor extends LitElement {
  @property({ attribute: false }) config: InstructionConfig = cloneConfig(DEFAULT_INSTRUCTION_CONFIG);
  @property({ type: Boolean }) editableIntro = false;

  @state() private draft: InstructionConfig = cloneConfig(DEFAULT_INSTRUCTION_CONFIG);
  @state() private gameMasterQuery = "";
  @state() private playerQuery = "";
  @state() private characterQuery = "";
  @state() private storyElementQuery = "";
  @state() private newPlayer = { name: "", description: "" };
  @state() private newCharacter = { name: "", race: "", className: "", defaultPlayerId: "" };
  @state() private newStoryElement = { name: "", description: "" };

  static override styles = [
    globalStyles,
    css`
      :host {
        display: grid;
        gap: var(--size-large);
      }

      .section,
      .entry-card,
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

      .section-title,
      .field-row,
      .inline-actions,
      .entry-header,
      .selection-row {
        display: flex;
        justify-content: space-between;
        gap: var(--size-medium);
        flex-wrap: wrap;
        align-items: center;
      }

      .stack,
      .entry-list,
      .form-grid,
      .meta-grid {
        display: grid;
        gap: var(--size-medium);
      }

      .form-grid.two {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      label {
        display: grid;
        gap: var(--size-small);
      }

      input,
      textarea,
      select {
        width: 100%;
        box-sizing: border-box;
        border-radius: 18px;
        padding: var(--size-medium);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        background: color-mix(in srgb, var(--color-primary-background) 72%, transparent);
        color: var(--color-primary-text);
        font: inherit;
      }

      textarea {
        min-height: 120px;
        resize: vertical;
      }

      button {
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 12%, transparent);
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-primary-background) 65%, transparent);
        color: var(--color-primary-text);
        padding: var(--size-small) var(--size-medium);
        cursor: pointer;
        box-shadow: var(--shadow-normal);
      }

      button:hover:not([disabled]) {
        border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
      }

      button[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
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

      .entry-card {
        display: grid;
        gap: var(--size-medium);
      }

      .checkbox-row {
        display: flex;
        align-items: center;
        gap: var(--size-small);
      }

      .checkbox-row input {
        width: auto;
      }

      .entry-actions {
        display: flex;
        gap: var(--size-small);
        flex-wrap: wrap;
      }

      .preview pre {
        white-space: pre-wrap;
        margin: 0;
        font: inherit;
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
    return buildInstructionText(this.draft, this.draft.defaults);
  }

  override render(): TemplateResult {
    const gameMasterMatches = this.draft.players.filter((player) => includesQuery([player.name, player.description], this.gameMasterQuery));
    const playerMatches = this.draft.players.filter((player) => includesQuery([player.name, player.description], this.playerQuery));
    const characterMatches = this.draft.characters.filter((character) => includesQuery([character.name, character.race, character.className], this.characterQuery));
    const storyElementMatches = this.draft.storyElements.filter((storyElement) =>
      includesQuery([storyElement.name, storyElement.description], this.storyElementQuery),
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
          : html`<div class="readonly-intro">${this.draft.intro}</div>`}
      </section>

      <section class="section">
        <div class="section-title">
          <div>
            <h3>Game Master</h3>
            <div class="pill">Search and select from players</div>
          </div>
        </div>
        <label>
          <span>Type-ahead search</span>
          <input .value=${this.gameMasterQuery} @input=${(event: Event) => this.handleQueryInput("gameMasterQuery", event)} placeholder="Search players" />
        </label>
        <div class="entry-list">
          ${gameMasterMatches.map(
            (player) => html`
              <button @click=${() => this.setGameMaster(player.id)} ?disabled=${this.draft.defaults.gameMasterPlayerId === player.id}>
                ${this.draft.defaults.gameMasterPlayerId === player.id ? `Game master: ${player.name}` : `Use ${player.name} as game master`}
              </button>
            `,
          )}
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <div>
            <h3>Players</h3>
            <div class="pill">Find, create, edit, remove</div>
          </div>
        </div>
        <label>
          <span>Type-ahead search</span>
          <input .value=${this.playerQuery} @input=${(event: Event) => this.handleQueryInput("playerQuery", event)} placeholder="Search players" />
        </label>
        <div class="form-grid two">
          <label>
            <span>New player name</span>
            <input .value=${this.newPlayer.name} @input=${(event: Event) => this.handleNewPlayerInput("name", event)} />
          </label>
          <label>
            <span>New player description</span>
            <input .value=${this.newPlayer.description} @input=${(event: Event) => this.handleNewPlayerInput("description", event)} />
          </label>
        </div>
        <div class="inline-actions">
          <button @click=${this.handleCreatePlayer} ?disabled=${this.newPlayer.name.trim().length === 0}>Add player</button>
        </div>
        <div class="entry-list">
          ${playerMatches.map((player) => this.renderPlayerCard(player))}
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <div>
            <h3>Characters</h3>
            <div class="pill">Find existing or create new</div>
          </div>
        </div>
        <label>
          <span>Type-ahead search</span>
          <input .value=${this.characterQuery} @input=${(event: Event) => this.handleQueryInput("characterQuery", event)} placeholder="Search characters" />
        </label>
        <div class="form-grid two">
          <label>
            <span>New character name</span>
            <input .value=${this.newCharacter.name} @input=${(event: Event) => this.handleNewCharacterInput("name", event)} />
          </label>
          <label>
            <span>Race</span>
            <input .value=${this.newCharacter.race} @input=${(event: Event) => this.handleNewCharacterInput("race", event)} />
          </label>
          <label>
            <span>Class</span>
            <input .value=${this.newCharacter.className} @input=${(event: Event) => this.handleNewCharacterInput("className", event)} />
          </label>
          <label>
            <span>Default player</span>
            <select .value=${this.newCharacter.defaultPlayerId} @change=${(event: Event) => this.handleNewCharacterInput("defaultPlayerId", event)}>
              <option value="">No default player</option>
              ${this.draft.players.map((player) => html`<option value=${player.id}>${player.name}</option>`)}
            </select>
          </label>
        </div>
        <div class="inline-actions">
          <button
            @click=${this.handleCreateCharacter}
            ?disabled=${this.newCharacter.name.trim().length === 0 || this.newCharacter.race.trim().length === 0 || this.newCharacter.className.trim().length === 0}>
            Add character
          </button>
        </div>
        <div class="entry-list">
          ${characterMatches.map((character) => this.renderCharacterCard(character))}
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <div>
            <h3>Story Elements</h3>
            <div class="pill">Find existing or create new</div>
          </div>
        </div>
        <label>
          <span>Type-ahead search</span>
          <input .value=${this.storyElementQuery} @input=${(event: Event) => this.handleQueryInput("storyElementQuery", event)} placeholder="Search story elements" />
        </label>
        <div class="form-grid two">
          <label>
            <span>New story element</span>
            <input .value=${this.newStoryElement.name} @input=${(event: Event) => this.handleNewStoryElementInput("name", event)} />
          </label>
          <label>
            <span>Description</span>
            <input .value=${this.newStoryElement.description} @input=${(event: Event) => this.handleNewStoryElementInput("description", event)} />
          </label>
        </div>
        <div class="inline-actions">
          <button @click=${this.handleCreateStoryElement} ?disabled=${this.newStoryElement.name.trim().length === 0}>Add story element</button>
        </div>
        <div class="entry-list">
          ${storyElementMatches.map((storyElement) => this.renderStoryElementCard(storyElement))}
        </div>
      </section>

      <section class="preview">
        <div class="section-title">
          <div>
            <h3>Computed Instructions Preview</h3>
            <div class="pill">Read-only review</div>
          </div>
        </div>
        <pre>${this.getComputedInstructions()}</pre>
      </section>
    `;
  }

  private renderPlayerCard(player: InstructionPlayer): TemplateResult {
    const isSelected = this.draft.defaults.playerIds.includes(player.id);
    return html`
      <article class="entry-card">
        <div class="entry-header">
          <strong>${player.name}</strong>
          <div class="entry-actions">
            <button @click=${() => this.togglePlayerSelection(player.id)}>${isSelected ? "Remove from new jobs" : "Use for new jobs"}</button>
            <button @click=${() => this.deletePlayer(player.id)}>Delete</button>
          </div>
        </div>
        <div class="form-grid two">
          <label>
            <span>Name</span>
            <input .value=${player.name} @input=${(event: Event) => this.updatePlayer(player.id, "name", event)} />
          </label>
          <label>
            <span>Description</span>
            <input .value=${player.description} @input=${(event: Event) => this.updatePlayer(player.id, "description", event)} />
          </label>
        </div>
        <div class="selection-row">
          <label class="checkbox-row">
            <input type="radio" name="game-master" .checked=${this.draft.defaults.gameMasterPlayerId === player.id} @change=${() => this.setGameMaster(player.id)} />
            <span>Game master</span>
          </label>
          ${isSelected ? html`<span class="pill">Selected for new jobs</span>` : html``}
        </div>
      </article>
    `;
  }

  private renderCharacterCard(character: InstructionCharacter): TemplateResult {
    const selection = this.draft.defaults.characterSelections.find((entry) => entry.characterId === character.id) ?? null;
    return html`
      <article class="entry-card">
        <div class="entry-header">
          <strong>${character.name}</strong>
          <div class="entry-actions">
            <button @click=${() => this.toggleCharacterSelection(character.id)}>${selection ? "Remove from new jobs" : "Use for new jobs"}</button>
            <button @click=${() => this.deleteCharacter(character.id)}>Delete</button>
          </div>
        </div>
        <div class="form-grid two">
          <label>
            <span>Name</span>
            <input .value=${character.name} @input=${(event: Event) => this.updateCharacter(character.id, "name", event)} />
          </label>
          <label>
            <span>Race</span>
            <input .value=${character.race} @input=${(event: Event) => this.updateCharacter(character.id, "race", event)} />
          </label>
          <label>
            <span>Class</span>
            <input .value=${character.className} @input=${(event: Event) => this.updateCharacter(character.id, "className", event)} />
          </label>
          <label>
            <span>Default player</span>
            <select .value=${character.defaultPlayerId ?? ""} @change=${(event: Event) => this.updateCharacter(character.id, "defaultPlayerId", event)}>
              <option value="">No default player</option>
              ${this.draft.players.map((player) => html`<option value=${player.id}>${player.name}</option>`)}
            </select>
          </label>
        </div>
        ${selection
          ? html`
              <label>
                <span>Player for this job</span>
                <select .value=${selection.playerId ?? ""} @change=${(event: Event) => this.updateCharacterSelection(character.id, event)}>
                  <option value="">No assigned player</option>
                  ${this.draft.players.map((player) => html`<option value=${player.id}>${player.name}</option>`)}
                </select>
              </label>
            `
          : html``}
      </article>
    `;
  }

  private renderStoryElementCard(storyElement: InstructionStoryElement): TemplateResult {
    const isSelected = this.draft.defaults.storyElementIds.includes(storyElement.id);
    return html`
      <article class="entry-card">
        <div class="entry-header">
          <strong>${storyElement.name}</strong>
          <div class="entry-actions">
            <button @click=${() => this.toggleStoryElementSelection(storyElement.id)}>${isSelected ? "Remove from new jobs" : "Use for new jobs"}</button>
            <button @click=${() => this.deleteStoryElement(storyElement.id)}>Delete</button>
          </div>
        </div>
        <div class="form-grid two">
          <label>
            <span>Name</span>
            <input .value=${storyElement.name} @input=${(event: Event) => this.updateStoryElement(storyElement.id, "name", event)} />
          </label>
          <label>
            <span>Description</span>
            <input .value=${storyElement.description} @input=${(event: Event) => this.updateStoryElement(storyElement.id, "description", event)} />
          </label>
        </div>
      </article>
    `;
  }

  private updateDraft(mutator: (draft: InstructionConfig) => void): void {
    const next = cloneConfig(this.draft);
    mutator(next);
    this.draft = normalizeInstructionConfig(next);
  }

  private handleIntroInput(event: Event): void {
    const target = event.currentTarget as HTMLTextAreaElement;
    this.updateDraft((draft) => {
      draft.intro = target.value;
    });
  }

  private handleQueryInput(key: "gameMasterQuery" | "playerQuery" | "characterQuery" | "storyElementQuery", event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    this[key] = target.value;
  }

  private handleNewPlayerInput(key: "name" | "description", event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    this.newPlayer = {
      ...this.newPlayer,
      [key]: target.value,
    };
  }

  private handleNewCharacterInput(key: "name" | "race" | "className" | "defaultPlayerId", event: Event): void {
    const target = event.currentTarget as HTMLInputElement | HTMLSelectElement;
    this.newCharacter = {
      ...this.newCharacter,
      [key]: target.value,
    };
  }

  private handleNewStoryElementInput(key: "name" | "description", event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    this.newStoryElement = {
      ...this.newStoryElement,
      [key]: target.value,
    };
  }

  private handleCreatePlayer = (): void => {
    const name = this.newPlayer.name.trim();
    if (!name) {
      return;
    }
    this.updateDraft((draft) => {
      const id = crypto.randomUUID();
      draft.players.push({
        id,
        name,
        description: this.newPlayer.description.trim(),
      });
      draft.defaults.playerIds = Array.from(new Set([...draft.defaults.playerIds, id]));
      if (!draft.defaults.gameMasterPlayerId) {
        draft.defaults.gameMasterPlayerId = id;
      }
    });
    this.newPlayer = { name: "", description: "" };
    this.playerQuery = "";
  };

  private handleCreateCharacter = (): void => {
    const name = this.newCharacter.name.trim();
    const race = this.newCharacter.race.trim();
    const className = this.newCharacter.className.trim();
    if (!name || !race || !className) {
      return;
    }
    this.updateDraft((draft) => {
      const id = crypto.randomUUID();
      draft.characters.push({
        id,
        name,
        race,
        className,
        defaultPlayerId: this.newCharacter.defaultPlayerId || null,
      });
      draft.defaults.characterSelections.push({
        characterId: id,
        playerId: this.newCharacter.defaultPlayerId || null,
      });
      if (this.newCharacter.defaultPlayerId) {
        draft.defaults.playerIds = Array.from(new Set([...draft.defaults.playerIds, this.newCharacter.defaultPlayerId]));
      }
    });
    this.newCharacter = { name: "", race: "", className: "", defaultPlayerId: "" };
    this.characterQuery = "";
  };

  private handleCreateStoryElement = (): void => {
    const name = this.newStoryElement.name.trim();
    if (!name) {
      return;
    }
    this.updateDraft((draft) => {
      const id = crypto.randomUUID();
      draft.storyElements.push({
        id,
        name,
        description: this.newStoryElement.description.trim(),
      });
      draft.defaults.storyElementIds = Array.from(new Set([...draft.defaults.storyElementIds, id]));
    });
    this.newStoryElement = { name: "", description: "" };
    this.storyElementQuery = "";
  };

  private setGameMaster(playerId: string): void {
    this.updateDraft((draft) => {
      draft.defaults.gameMasterPlayerId = playerId;
      draft.defaults.playerIds = Array.from(new Set([...draft.defaults.playerIds, playerId]));
    });
  }

  private togglePlayerSelection(playerId: string): void {
    this.updateDraft((draft) => {
      const isSelected = draft.defaults.playerIds.includes(playerId);
      draft.defaults.playerIds = isSelected
        ? draft.defaults.playerIds.filter((id) => id !== playerId)
        : [...draft.defaults.playerIds, playerId];
      if (isSelected && draft.defaults.gameMasterPlayerId === playerId) {
        draft.defaults.gameMasterPlayerId = null;
      }
      draft.defaults.characterSelections = draft.defaults.characterSelections.map((selection) =>
        selection.playerId === playerId ? { ...selection, playerId: null } : selection,
      );
    });
  }

  private toggleCharacterSelection(characterId: string): void {
    this.updateDraft((draft) => {
      const existing = draft.defaults.characterSelections.find((selection) => selection.characterId === characterId);
      if (existing) {
        draft.defaults.characterSelections = draft.defaults.characterSelections.filter((selection) => selection.characterId !== characterId);
        return;
      }
      const character = draft.characters.find((entry) => entry.id === characterId);
      draft.defaults.characterSelections.push({
        characterId,
        playerId: character?.defaultPlayerId ?? null,
      });
    });
  }

  private toggleStoryElementSelection(storyElementId: string): void {
    this.updateDraft((draft) => {
      const isSelected = draft.defaults.storyElementIds.includes(storyElementId);
      draft.defaults.storyElementIds = isSelected
        ? draft.defaults.storyElementIds.filter((id) => id !== storyElementId)
        : [...draft.defaults.storyElementIds, storyElementId];
    });
  }

  private updatePlayer(playerId: string, field: "name" | "description", event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    this.updateDraft((draft) => {
      draft.players = draft.players.map((player) => (player.id === playerId ? { ...player, [field]: target.value } : player));
    });
  }

  private updateCharacter(characterId: string, field: "name" | "race" | "className" | "defaultPlayerId", event: Event): void {
    const target = event.currentTarget as HTMLInputElement | HTMLSelectElement;
    this.updateDraft((draft) => {
      draft.characters = draft.characters.map((character) =>
        character.id === characterId
          ? {
              ...character,
              [field]: field === "defaultPlayerId" ? target.value || null : target.value,
            }
          : character,
      );
    });
  }

  private updateCharacterSelection(characterId: string, event: Event): void {
    const target = event.currentTarget as HTMLSelectElement;
    this.updateDraft((draft) => {
      draft.defaults.characterSelections = draft.defaults.characterSelections.map((selection) =>
        selection.characterId === characterId ? { ...selection, playerId: target.value || null } : selection,
      );
    });
  }

  private updateStoryElement(storyElementId: string, field: "name" | "description", event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    this.updateDraft((draft) => {
      draft.storyElements = draft.storyElements.map((storyElement) =>
        storyElement.id === storyElementId ? { ...storyElement, [field]: target.value } : storyElement,
      );
    });
  }

  private deletePlayer(playerId: string): void {
    this.updateDraft((draft) => {
      draft.players = draft.players.filter((player) => player.id !== playerId);
      draft.defaults.playerIds = draft.defaults.playerIds.filter((id) => id !== playerId);
      draft.defaults.characterSelections = draft.defaults.characterSelections.map((selection) =>
        selection.playerId === playerId ? { ...selection, playerId: null } : selection,
      );
      draft.characters = draft.characters.map((character) =>
        character.defaultPlayerId === playerId ? { ...character, defaultPlayerId: null } : character,
      );
      if (draft.defaults.gameMasterPlayerId === playerId) {
        draft.defaults.gameMasterPlayerId = draft.defaults.playerIds[0] ?? null;
      }
    });
  }

  private deleteCharacter(characterId: string): void {
    this.updateDraft((draft) => {
      draft.characters = draft.characters.filter((character) => character.id !== characterId);
      draft.defaults.characterSelections = draft.defaults.characterSelections.filter((selection) => selection.characterId !== characterId);
    });
  }

  private deleteStoryElement(storyElementId: string): void {
    this.updateDraft((draft) => {
      draft.storyElements = draft.storyElements.filter((storyElement) => storyElement.id !== storyElementId);
      draft.defaults.storyElementIds = draft.defaults.storyElementIds.filter((id) => id !== storyElementId);
    });
  }
}