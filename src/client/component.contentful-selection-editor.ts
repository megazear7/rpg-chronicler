import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { globalStyles } from "./styles.global.js";
import { ContentfulCatalog, ContentfulReference, ContentfulSubmissionSelection, DefaultContentfulSubmissionSelection } from "../shared/type.contentful-context.js";
import { normalizeSubmissionSelection, resolveSelectedCharacterAssignments } from "../shared/util.contentful-context.js";
import { searchContentfulEventsService } from "../shared/service.search-contentful-events.js";

type SelectionKey = "characterIds" | "locationIds" | "npcIds" | "previousEventIds";
type QueryKey = "adventure" | "gameMaster" | "characters" | "locations" | "npcs" | "previousEvents";
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function includesQuery(option: ContentfulReference, query: string): boolean {
  const value = query.trim().toLowerCase();
  if (!value) {
    return true;
  }
  return [option.title, option.subtitle, option.description].some((entry) => (entry ?? "").toLowerCase().includes(value));
}

@customElement("rpg-chronicler-contentful-selection-editor")
export class RpgChroniclerContentfulSelectionEditor extends LitElement {
  @property({ attribute: false }) catalog: ContentfulCatalog | null = null;
  @property({ attribute: false }) selection: ContentfulSubmissionSelection = DefaultContentfulSubmissionSelection;
  @property({ type: Boolean }) editableEventDate = true;
  @property({ attribute: false }) searchBeforeListingQueries: QueryKey[] = [];

  @state() private draft: ContentfulSubmissionSelection = DefaultContentfulSubmissionSelection;
  @state() private previousEventSearchResults: ContentfulReference[] = [];
  @state() private previousEventSearchLoading = false;
  @state() private draggedCharacterId: string | null = null;
  @state() private queries: Record<QueryKey, string> = {
    adventure: "",
    gameMaster: "",
    characters: "",
    locations: "",
    npcs: "",
    previousEvents: "",
  };
  private previousEventSearchRequestId = 0;

  static override styles = [
    globalStyles,
    css`
      :host {
        display: grid;
        gap: var(--size-large);
      }

      .section {
        display: grid;
        gap: var(--size-medium);
        background: color-mix(in srgb, var(--color-secondary-surface) 92%, black);
        border-radius: 28px;
        padding: var(--size-large);
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
        box-shadow: var(--shadow-normal);
      }

      .section-header,
      .selection-row,
      .date-grid {
        display: flex;
        gap: var(--size-medium);
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
      }

      .search,
      .meta,
      .grid,
      .selected-list {
        display: grid;
        gap: var(--size-medium);
      }

      .grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      input,
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

      select {
        appearance: none;
        background-repeat: no-repeat;
        background-position: right 1rem center;
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary-text) 6%, transparent), var(--shadow-normal);
      }

      .month-select {
        position: relative;
      }

      .month-select::after {
        content: "▾";
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: color-mix(in srgb, var(--color-accent) 80%, white);
        font-size: 0.95rem;
      }

      .option-card {
        display: grid;
        gap: var(--size-small);
        padding: var(--size-medium);
        color: var(--color-primary-text);
        border-radius: 22px;
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
        background: color-mix(in srgb, var(--color-primary-background) 52%, transparent);
        cursor: pointer;
        transition: var(--transition-all);
      }

      .option-card:hover {
        border-color: color-mix(in srgb, var(--color-accent) 48%, transparent);
        transform: translateY(-1px);
      }

      .option-card.selected {
        border-color: color-mix(in srgb, var(--color-accent) 72%, white);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 18%, transparent);
        background: color-mix(in srgb, var(--color-accent) 12%, var(--color-primary-background));
      }

      .pill-list {
        display: flex;
        gap: var(--size-small);
        flex-wrap: wrap;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border-radius: 999px;
        padding: 0.35rem 0.8rem;
        background: color-mix(in srgb, var(--color-primary-text) 10%, transparent);
        font-size: var(--font-small);
      }

      .subtitle,
      .empty {
        opacity: 0.72;
      }

      .date-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      }

      .assignment-list,
      .assignment-card,
      .assignment-select {
        display: grid;
        gap: var(--size-small);
      }

      .assignment-card {
        position: relative;
        padding: var(--size-medium);
        border-radius: 22px;
        border: 1px solid color-mix(in srgb, var(--color-primary-text) 10%, transparent);
        background: color-mix(in srgb, var(--color-primary-background) 52%, transparent);
        cursor: grab;
      }

      .assignment-card.drag-over {
        border-color: color-mix(in srgb, var(--color-accent) 60%, white);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 18%, transparent);
      }

      .assignment-card-header {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: var(--size-small);
      }

      .card-dismiss {
        width: auto;
        border: none;
        background: transparent;
        color: var(--color-primary-text);
        opacity: 0.75;
        padding: 0;
        line-height: 1;
        font-size: 1.1rem;
        cursor: pointer;
      }

      .card-dismiss:hover {
        opacity: 1;
      }

      .assignment-empty {
        margin-top: var(--size-small);
      }
    `,
  ];

  override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("selection") || changedProperties.has("catalog")) {
      this.draft = this.applyDefaultCharacterAssignments(this.applyDerivedEventDate(normalizeSubmissionSelection(this.selection)));
    }
  }

  getValue(): ContentfulSubmissionSelection {
    return normalizeSubmissionSelection(this.draft);
  }

  override render(): TemplateResult {
    if (!this.catalog) {
      return html`<section class="section"><p>Loading Contentful options...</p></section>`;
    }

    return html`
      ${this.renderAdventureSection()}
      ${this.renderGameMasterSection()}
      ${this.renderCharacterSection()}
      ${this.renderMultiSelectSection("Locations", "locations", this.catalog.locations, "locationIds")}
      ${this.renderMultiSelectSection("NPCs", "npcs", this.catalog.npcs, "npcIds")}
      ${this.renderMultiSelectSection("Previous Events", "previousEvents", this.previousEventOptions, "previousEventIds")}
      ${this.editableEventDate ? this.renderEventDateSection() : html``}
    `;
  }

  private get previousEventOptions(): ContentfulReference[] {
    if (this.queries.previousEvents.trim().length === 0) {
      return this.availableEvents;
    }

    return this.previousEventSearchResults;
  }

  private get availableEvents() {
    if (!this.catalog) {
      return [];
    }
    const selectedAdventure = this.catalog.adventures.find((entry) => entry.id === this.draft.adventureId);
    if (!selectedAdventure) {
      return this.catalog.events;
    }
    const allowed = new Set(selectedAdventure.eventIds);
    return this.catalog.events.filter((entry) => entry.adventureId === selectedAdventure.id || allowed.has(entry.id));
  }

  private renderAdventureSection(): TemplateResult {
    const adventures = (this.catalog?.adventures ?? []).filter((entry) => includesQuery(entry, this.queries.adventure));
    const selectedAdventure = this.catalog?.adventures.find((entry) => entry.id === this.draft.adventureId) ?? null;

    return html`
      <section class="section">
        <div class="section-header">
          <div>
            <h3>Adventure</h3>
            <div class="subtitle">Choose the current adventure so RPG Chronicler can pull previous events.</div>
          </div>
          ${selectedAdventure ? html`<div class="pill">${selectedAdventure.title}</div>` : html`<div class="pill">No adventure selected</div>`}
        </div>
        <input .value=${this.queries.adventure} @input=${(event: Event) => this.updateQuery("adventure", event)} placeholder="Search adventures" />
        <div class="grid">
          ${adventures.map(
            (entry) => html`
              <button class=${`option-card ${this.draft.adventureId === entry.id ? "selected" : ""}`} @click=${() => this.setAdventure(entry.id)}>
                <strong>${entry.title}</strong>
              </button>
            `,
          )}
        </div>
      </section>
    `;
  }

  private renderGameMasterSection(): TemplateResult {
    const players = (this.catalog?.players ?? []).filter((entry) => includesQuery(entry, this.queries.gameMaster));
    return html`
      <section class="section">
        <div class="section-header">
          <div>
            <h3>Game Master</h3>
            <div class="subtitle">Pick the DM/player context to emphasize in prompts.</div>
          </div>
          <div class="pill">${this.findTitle(this.catalog?.players ?? [], this.draft.gameMasterPlayerId) ?? "No game master selected"}</div>
        </div>
        <input .value=${this.queries.gameMaster} @input=${(event: Event) => this.updateQuery("gameMaster", event)} placeholder="Search players for the game master" />
        <div class="grid">
          ${players.map(
            (entry) => html`
              <button class=${`option-card ${this.draft.gameMasterPlayerId === entry.id ? "selected" : ""}`} @click=${() => this.setGameMaster(entry.id)}>
                <strong>${entry.title}</strong>
                ${entry.description ? html`<div class="subtitle">${entry.description}</div>` : html``}
              </button>
            `,
          )}
        </div>
      </section>
    `;
  }

  private renderCharacterSection(): TemplateResult {
    const characters = (this.catalog?.characters ?? []).filter((entry) => includesQuery(entry, this.queries.characters));
    const requiresSearch = true;
    const query = this.queries.characters;
    const filteredCharacters = requiresSearch && query.trim().length === 0 ? [] : characters;
    const selectedCharacters = this.draft.characterIds
      .map((characterId) => this.catalog?.characters.find((entry) => entry.id === characterId) ?? null)
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    return html`
      <section class="section">
        <div class="section-header">
          <div>
            <h3>Characters</h3>
            <div class="subtitle">Select the characters for this session and choose which player is playing each one.</div>
          </div>
          <div class="pill">${this.draft.characterIds.length} selected</div>
        </div>
        <input .value=${this.queries.characters} @input=${(event: Event) => this.updateQuery("characters", event)} placeholder="Search characters" />
        ${requiresSearch && query.trim().length === 0 ? html`<div class="empty">Start typing to search characters.</div>` : html``}
        <div class="grid">
          ${filteredCharacters.map(
            (entry) => html`
              <button class=${`option-card ${this.draft.characterIds.includes(entry.id) ? "selected" : ""}`} @click=${() => this.toggleSelection("characterIds", entry.id)}>
                <strong>${entry.title}</strong>
                ${entry.subtitle ? html`<div class="subtitle">${entry.subtitle}</div>` : html``}
                ${entry.description ? html`<div class="subtitle">${entry.description}</div>` : html``}
              </button>
            `,
          )}
        </div>
        <div class="assignment-list">
          ${selectedCharacters.length === 0
            ? html`<div class="empty assignment-empty">No characters selected yet.</div>`
            : selectedCharacters.map(
                (character) => html`
                  <div
                    class=${`assignment-card ${this.draggedCharacterId === character.id ? "drag-over" : ""}`}
                    draggable="true"
                    @dragstart=${(event: DragEvent) => this.handleAssignmentDragStart(character.id, event)}
                    @dragend=${this.handleAssignmentDragEnd}
                    @dragover=${this.handleAssignmentDragOver}
                    @drop=${(event: DragEvent) => this.handleAssignmentDrop(character.id, event)}>
                    <div class="assignment-card-header">
                      <strong>${character.title}</strong>
                      <button class="card-dismiss" aria-label=${`Remove ${character.title}`} @click=${(event: Event) => this.removeCharacter(character.id, event)}>×</button>
                    </div>
                    ${character.subtitle ? html`<div class="subtitle">${character.subtitle}</div>` : html``}
                    <label class="assignment-select">
                      <span class="subtitle">Is played by</span>
                      <select .value=${this.getAssignedPlayerId(character.id) ?? ""} @change=${(event: Event) => this.updateCharacterAssignment(character.id, event)}>
                        <option value="">Select player</option>
                        ${(this.catalog?.players ?? []).map(
                          (player) => html`<option value=${player.id}>${player.title}</option>`,
                        )}
                      </select>
                    </label>
                  </div>
                `,
              )}
        </div>
      </section>
    `;
  }

  private renderMultiSelectSection(
    title: string,
    queryKey: QueryKey,
    options: ContentfulReference[],
    selectionKey: SelectionKey,
  ): TemplateResult {
    const query = this.queries[queryKey];
    const requiresSearch = this.searchBeforeListingQueries.includes(queryKey);
    const filtered = requiresSearch && query.trim().length === 0 ? [] : options.filter((entry) => includesQuery(entry, query));
    const selectedIds = this.draft[selectionKey];
    const labelOptions = selectionKey === "previousEventIds" ? [...options, ...(this.catalog?.events ?? [])] : options;

    return html`
      <section class="section">
        <div class="section-header">
          <div>
            <h3>${title}</h3>
            <div class="subtitle">Select the entries to carry into the job snapshot and publishing flow.</div>
          </div>
          <div class="pill">${selectedIds.length} selected</div>
        </div>
        <input .value=${this.queries[queryKey]} @input=${(event: Event) => this.updateQuery(queryKey, event)} placeholder=${`Search ${title.toLowerCase()}`} />
        <div class="pill-list">
          ${selectedIds.length === 0
            ? html`<span class="empty">Nothing selected yet.</span>`
            : selectedIds.map((id) => html`<span class="pill">${this.findTitle(labelOptions, id) ?? id}</span>`)}
        </div>
        ${requiresSearch && query.trim().length === 0
          ? html`<div class="empty">Start typing to search ${title.toLowerCase()}.</div>`
          : queryKey === "previousEvents" && this.previousEventSearchLoading
            ? html`<div class="empty">Searching previous events...</div>`
          : html`
              <div class="grid">
                ${filtered.map(
                  (entry) => html`
                    <button class=${`option-card ${selectedIds.includes(entry.id) ? "selected" : ""}`} @click=${() => this.toggleSelection(selectionKey, entry.id)}>
                      <strong>${entry.title}</strong>
                      ${entry.subtitle ? html`<div class="subtitle">${entry.subtitle}</div>` : html``}
                      ${entry.description ? html`<div class="subtitle">${entry.description}</div>` : html``}
                    </button>
                  `,
                )}
              </div>
            `}
      </section>
    `;
  }

  private renderEventDateSection(): TemplateResult {
    return html`
      <section class="section">
        <div class="section-header">
          <div>
            <h3>Event Date</h3>
            <div class="subtitle">The in-world date of the event. This defaults to the most recent adventure event plus one day.</div>
          </div>
        </div>
        <div class="date-grid">
          <input type="number" .value=${String(this.draft.year ?? "")} @input=${(event: Event) => this.updateNumberField("year", event)} placeholder="Year" />
          <label class="month-select">
            <select .value=${this.draft.month ?? ""} @change=${(event: Event) => this.updateTextField("month", event)} aria-label="Month">
              <option value="">Select month</option>
              ${MONTH_NAMES.map((monthName, index) => {
                const value = `${index + 1}: ${monthName}`;
                return html`<option value=${value}>${monthName}</option>`;
              })}
            </select>
          </label>
          <input type="number" .value=${String(this.draft.day ?? "")} @input=${(event: Event) => this.updateNumberField("day", event)} placeholder="Day" />
        </div>
      </section>
    `;
  }

  private applyDerivedEventDate(selection: ContentfulSubmissionSelection): ContentfulSubmissionSelection {
    if (selection.year !== null || selection.month || selection.day !== null) {
      return selection;
    }
    const derived = this.deriveEventDate(selection.adventureId);
    return derived
      ? normalizeSubmissionSelection({
          ...selection,
          year: derived.year,
          month: derived.month,
          day: derived.day,
        })
      : selection;
  }

  private applyDefaultCharacterAssignments(selection: ContentfulSubmissionSelection): ContentfulSubmissionSelection {
    if (!this.catalog) {
      return selection;
    }

    return normalizeSubmissionSelection({
      ...selection,
      characterAssignments: resolveSelectedCharacterAssignments(this.catalog, selection).map(({ character, player }) => ({
        characterId: character.id,
        playerId: player?.id ?? null,
      })),
    });
  }

  private deriveEventDate(adventureId: string | null): { year: number; month: string; day: number } | null {
    if (!this.catalog || !adventureId) {
      return null;
    }

    const selectedAdventure = this.catalog.adventures.find((entry) => entry.id === adventureId);
    const allowed = new Set(selectedAdventure?.eventIds ?? []);
    const datedEvents = this.catalog.events
      .filter((entry) => entry.adventureId === adventureId || allowed.has(entry.id))
      .filter((entry) => entry.year !== null && entry.month && entry.day !== null)
      .sort((left, right) => this.compareDates(left, right));

    const latest = datedEvents.length > 0 ? datedEvents[datedEvents.length - 1] : null;
    if (!latest || latest.year === null || !latest.month || latest.day === null) {
      return null;
    }
    const year = latest.year as number;
    const month = latest.month as string;
    const day = latest.day as number;
    return this.nextCalendarDay(year, month, day);
  }

  private compareDates(
    left: { year?: number | null; month?: string | null; day?: number | null },
    right: { year?: number | null; month?: string | null; day?: number | null },
  ): number {
    const leftMonth = this.parseMonthIndex(left.month ?? null);
    const rightMonth = this.parseMonthIndex(right.month ?? null);
    if (left.year === null || left.year === undefined || leftMonth === null || left.day === null || left.day === undefined) {
      return -1;
    }
    if (right.year === null || right.year === undefined || rightMonth === null || right.day === null || right.day === undefined) {
      return 1;
    }
    return Date.UTC(left.year, leftMonth, left.day) - Date.UTC(right.year, rightMonth, right.day);
  }

  private parseMonthIndex(month: string | null): number | null {
    if (!month) {
      return null;
    }
    const prefixedMatch = month.match(/^(\d{1,2})\s*:/);
    if (prefixedMatch) {
      const monthNumber = Number(prefixedMatch[1]);
      if (monthNumber >= 1 && monthNumber <= 12) {
        return monthNumber - 1;
      }
    }
    const normalized = month.trim().toLowerCase();
    const nameIndex = MONTH_NAMES.findIndex((name) => name.toLowerCase() === normalized);
    return nameIndex >= 0 ? nameIndex : null;
  }

  private nextCalendarDay(year: number, month: string, day: number): { year: number; month: string; day: number } {
    const monthIndex = this.parseMonthIndex(month);
    if (monthIndex === null) {
      return { year, month, day };
    }
    const next = new Date(Date.UTC(year, monthIndex, day));
    next.setUTCDate(next.getUTCDate() + 1);
    return {
      year: next.getUTCFullYear(),
      month: `${next.getUTCMonth() + 1}: ${MONTH_NAMES[next.getUTCMonth()]}`,
      day: next.getUTCDate(),
    };
  }

  private updateDraft(next: ContentfulSubmissionSelection): void {
    this.draft = next;
    this.dispatchEvent(
      new CustomEvent<ContentfulSubmissionSelection>("selection-change", {
        detail: this.getValue(),
        bubbles: true,
        composed: true,
      }),
    );
  }

  private updateQuery(key: QueryKey, event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    this.queries = {
      ...this.queries,
      [key]: target.value,
    };

    if (key === "previousEvents") {
      void this.loadPreviousEventResults(target.value);
    }
  }

  private async loadPreviousEventResults(query: string): Promise<void> {
    const normalizedQuery = query.trim();
    const requestId = ++this.previousEventSearchRequestId;

    if (normalizedQuery.length === 0) {
      this.previousEventSearchLoading = false;
      this.previousEventSearchResults = [];
      return;
    }

    this.previousEventSearchLoading = true;
    try {
      const results = await searchContentfulEventsService.fetch({ query: normalizedQuery });
      if (requestId !== this.previousEventSearchRequestId) {
        return;
      }
      this.previousEventSearchResults = results;
    } finally {
      if (requestId === this.previousEventSearchRequestId) {
        this.previousEventSearchLoading = false;
      }
    }
  }

  private setAdventure(adventureId: string): void {
    const allowedPreviousEvents = new Set(
      (this.catalog?.events ?? [])
        .filter((entry) => entry.adventureId === adventureId || (this.catalog?.adventures.find((adventure) => adventure.id === adventureId)?.eventIds ?? []).includes(entry.id))
        .map((entry) => entry.id),
    );
    const derivedDate = this.deriveEventDate(adventureId);
    this.updateDraft(normalizeSubmissionSelection({
      ...this.draft,
      adventureId,
      previousEventIds: this.draft.previousEventIds.filter((id) => allowedPreviousEvents.has(id)),
      year: derivedDate?.year ?? null,
      month: derivedDate?.month ?? null,
      day: derivedDate?.day ?? null,
    }));

    if (this.queries.previousEvents.trim().length > 0) {
      void this.loadPreviousEventResults(this.queries.previousEvents);
    }
  }

  private setGameMaster(playerId: string): void {
    this.updateDraft(normalizeSubmissionSelection({
      ...this.draft,
      gameMasterPlayerId: playerId,
    }));
  }

  private toggleSelection(key: SelectionKey, id: string): void {
    const current = this.draft[key];
    const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
    if (key === "characterIds") {
      const nextAssignments = next.includes(id)
        ? [
            ...this.draft.characterAssignments.filter((entry) => entry.characterId !== id),
            {
              characterId: id,
              playerId: this.draft.characterAssignments.find((entry) => entry.characterId === id)?.playerId
                ?? this.catalog?.characters.find((entry) => entry.id === id)?.playerId
                ?? null,
            },
          ]
        : this.draft.characterAssignments.filter((entry) => entry.characterId !== id);
      this.updateDraft(normalizeSubmissionSelection({
        ...this.draft,
        characterIds: next,
        characterAssignments: nextAssignments,
      }));
      return;
    }

    this.updateDraft(normalizeSubmissionSelection({
      ...this.draft,
      [key]: next,
    }));
  }

  private updateCharacterAssignment(characterId: string, event: Event): void {
    const target = event.currentTarget as HTMLSelectElement;
    const playerId = target.value.trim() || null;
    this.updateDraft(normalizeSubmissionSelection({
      ...this.draft,
      characterAssignments: [
        ...this.draft.characterAssignments.filter((entry) => entry.characterId !== characterId),
        { characterId, playerId },
      ],
    }));
  }

  private removeCharacter(characterId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.updateDraft(normalizeSubmissionSelection({
      ...this.draft,
      characterIds: this.draft.characterIds.filter((entry) => entry !== characterId),
      characterAssignments: this.draft.characterAssignments.filter((entry) => entry.characterId !== characterId),
    }));
  }

  private handleAssignmentDragStart(characterId: string, event: DragEvent): void {
    this.draggedCharacterId = characterId;
    event.dataTransfer?.setData("text/plain", characterId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  private handleAssignmentDragEnd = (): void => {
    this.draggedCharacterId = null;
  };

  private handleAssignmentDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  private handleAssignmentDrop(targetCharacterId: string, event: DragEvent): void {
    event.preventDefault();
    const sourceCharacterId = event.dataTransfer?.getData("text/plain") ?? this.draggedCharacterId;
    this.draggedCharacterId = null;

    if (!sourceCharacterId || sourceCharacterId === targetCharacterId) {
      return;
    }

    const reorderedCharacterIds = [...this.draft.characterIds];
    const sourceIndex = reorderedCharacterIds.indexOf(sourceCharacterId);
    const targetIndex = reorderedCharacterIds.indexOf(targetCharacterId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const [movedCharacterId] = reorderedCharacterIds.splice(sourceIndex, 1);
    reorderedCharacterIds.splice(targetIndex, 0, movedCharacterId);

    const assignmentByCharacterId = new Map(this.draft.characterAssignments.map((entry) => [entry.characterId, entry]));
    this.updateDraft(normalizeSubmissionSelection({
      ...this.draft,
      characterIds: reorderedCharacterIds,
      characterAssignments: reorderedCharacterIds
        .map((characterId) => assignmentByCharacterId.get(characterId))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    }));
  }

  private updateNumberField(key: "year" | "day", event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    const parsed = target.value.trim().length === 0 ? null : Number(target.value);
    this.updateDraft(normalizeSubmissionSelection({
      ...this.draft,
      [key]: Number.isFinite(parsed) ? parsed : null,
    }));
  }

  private updateTextField(key: "month", event: Event): void {
    const target = event.currentTarget as HTMLInputElement | HTMLSelectElement;
    this.updateDraft(normalizeSubmissionSelection({
      ...this.draft,
      [key]: target.value.trim() || null,
    }));
  }

  private findTitle(options: ContentfulReference[], id: string | null): string | null {
    return id ? options.find((entry) => entry.id === id)?.title ?? null : null;
  }

  private getAssignedPlayerId(characterId: string): string | null {
    const assigned = this.draft.characterAssignments.find((entry) => entry.characterId === characterId);
    if (assigned) {
      return assigned.playerId;
    }
    return this.catalog?.characters.find((entry) => entry.id === characterId)?.playerId ?? null;
  }
}