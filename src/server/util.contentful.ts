import path from "path";
import { promises as fs } from "fs";
import pkg from "contentful-management";
import type { Environment, Space } from "contentful-management";
import { env } from "./main.env.js";
import {
  ContentfulCatalog,
  ContentfulEventReference,
  ContentfulSubmissionSelection,
  ContentfulSubmissionSnapshot,
} from "../shared/type.contentful-context.js";
import {
  formatCharacterAssignmentLine,
  normalizeSubmissionSelection,
  resolveSelectedCharacterAssignments,
  resolveSelectedPlayers,
} from "../shared/util.contentful-context.js";

const { createClient } = pkg;
const LOCALE = "en-US";
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

type ContentfulEnvironment = Environment;

type LocalizedValue<T> = Partial<Record<typeof LOCALE, T>>;
type ContentfulFields = Record<string, LocalizedValue<unknown> | undefined>;
type ContentfulEntryLike = {
  sys: { id: string };
  fields: ContentfulFields;
};
type RichTextNode = {
  value?: unknown;
  content?: unknown;
  nodeType?: unknown;
};

function getTextField(fields: ContentfulFields, key: string): string | null {
  const value = fields[key]?.[LOCALE];
  return typeof value === "string" ? value : null;
}

function getNumberField(fields: ContentfulFields, key: string): number | null {
  const value = fields[key]?.[LOCALE];
  return typeof value === "number" ? value : null;
}

function getLinkId(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const sys = (value as { sys?: { id?: string } }).sys;
  return typeof sys?.id === "string" ? sys.id : null;
}

function getLinkIds(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => getLinkId(value)).filter((value): value is string => Boolean(value));
}

function richTextToPlainText(document: unknown): string | null {
  if (!document || typeof document !== "object") {
    return null;
  }
  const lines: string[] = [];

  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") {
      return;
    }
    const richTextNode = node as RichTextNode;
    if (typeof richTextNode.value === "string" && richTextNode.value.trim().length > 0) {
      lines.push(richTextNode.value.trim());
    }
    if (Array.isArray(richTextNode.content)) {
      for (const child of richTextNode.content) {
        visit(child);
      }
      if (richTextNode.nodeType === "paragraph") {
        lines.push("\n");
      }
    }
  };

  visit(document);
  return (
    lines
      .join(" ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .replace(/\s{2,}/g, " ")
      .trim() || null
  );
}

function includesQuery(value: string | null | undefined, query: string): boolean {
  return (value ?? "").toLowerCase().includes(query);
}

async function getContentfulSpace(): Promise<Space> {
  const client = createClient({
    accessToken: env.CONTENTFUL_MANAGEMENT_API_KEY,
  });
  return client.getSpace(env.CONTENTFUL_SPACE_ID);
}

async function getContentfulEnvironment(): Promise<ContentfulEnvironment> {
  const space = await getContentfulSpace();
  return space.getEnvironment(env.CONTENTFUL_ENVIRONMENT_ID);
}

async function listEntries(environment: ContentfulEnvironment, contentType: string): Promise<ContentfulEntryLike[]> {
  const items: ContentfulEntryLike[] = [];
  let skip = 0;
  const limit = 200;
  while (true) {
    const response = await environment.getEntries({ content_type: contentType, skip, limit });
    items.push(...response.items);
    skip += response.items.length;
    if (skip >= response.total || response.items.length === 0) {
      break;
    }
  }
  return items;
}

function mapEventReference(entry: ContentfulEntryLike): ContentfulEventReference {
  return ContentfulEventReference.parse({
    id: entry.sys.id,
    type: "event",
    title: getTextField(entry.fields, "title") ?? "Untitled event",
    subtitle: [
      getNumberField(entry.fields, "year"),
      getTextField(entry.fields, "month"),
      getNumberField(entry.fields, "day"),
    ]
      .filter((value) => value !== null)
      .join(" "),
    description: richTextToPlainText(entry.fields.description?.[LOCALE]),
    summary: richTextToPlainText(entry.fields.summary?.[LOCALE]),
    adventureId: getLinkId(entry.fields.adventure?.[LOCALE]),
    ordering: getNumberField(entry.fields, "ordering"),
    year: getNumberField(entry.fields, "year"),
    month: getTextField(entry.fields, "month"),
    day: getNumberField(entry.fields, "day"),
  });
}

export async function searchContentfulEvents(query: string): Promise<ContentfulEventReference[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return [];
  }

  const environment = await getContentfulEnvironment();
  const events = await listEntries(environment, "event");

  return events
    .map((entry) => mapEventReference(entry))
    .filter(
      (entry) =>
        includesQuery(entry.title, normalizedQuery) ||
        includesQuery(entry.subtitle, normalizedQuery) ||
        includesQuery(entry.description, normalizedQuery) ||
        includesQuery(entry.summary, normalizedQuery),
    )
    .sort(
      (left, right) =>
        compareEventDates(
          { year: left.year ?? null, month: left.month ?? null, day: left.day ?? null },
          { year: right.year ?? null, month: right.month ?? null, day: right.day ?? null },
        ) * -1 || left.title.localeCompare(right.title),
    )
    .slice(0, 50);
}

function parseMonthIndex(month: string | null | undefined): number | null {
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

function formatMonthLabel(monthIndex: number): string {
  return `${monthIndex + 1}: ${MONTH_NAMES[monthIndex]}`;
}

function nextCalendarDay(input: { year: number; month: string; day: number }): {
  year: number;
  month: string;
  day: number;
} {
  const monthIndex = parseMonthIndex(input.month);
  if (monthIndex === null) {
    return input;
  }

  const next = new Date(Date.UTC(input.year, monthIndex, input.day));
  next.setUTCDate(next.getUTCDate() + 1);
  return {
    year: next.getUTCFullYear(),
    month: formatMonthLabel(next.getUTCMonth()),
    day: next.getUTCDate(),
  };
}

function compareEventDates(
  left: { year: number | null; month: string | null; day: number | null },
  right: { year: number | null; month: string | null; day: number | null },
): number {
  const leftMonth = parseMonthIndex(left.month);
  const rightMonth = parseMonthIndex(right.month);
  if (left.year === null || leftMonth === null || left.day === null) {
    return -1;
  }
  if (right.year === null || rightMonth === null || right.day === null) {
    return 1;
  }

  const leftTime = Date.UTC(left.year, leftMonth, left.day);
  const rightTime = Date.UTC(right.year, rightMonth, right.day);
  return leftTime - rightTime;
}

type AdventureEventDate = {
  year: number;
  month: string;
  day: number;
};

async function deriveEventDate(
  environment: ContentfulEnvironment,
  adventureId: string | null | undefined,
  requestedDate: { year?: number | null; month?: string | null; day?: number | null },
): Promise<{ year: number | null; month: string | null; day: number | null }> {
  const explicitYear = requestedDate.year ?? null;
  const explicitMonth = requestedDate.month ?? null;
  const explicitDay = requestedDate.day ?? null;

  if (!adventureId) {
    return {
      year: explicitYear,
      month: explicitMonth,
      day: explicitDay,
    };
  }

  const [adventure, allEvents] = await Promise.all([
    environment.getEntry(adventureId),
    listEntries(environment, "event"),
  ]);
  const reverseLinkedIds = new Set(getLinkIds(adventure.fields.events?.[LOCALE]));
  const adventureEvents: AdventureEventDate[] = allEvents
    .filter(
      (entry: ContentfulEntryLike) =>
        getLinkId(entry.fields.adventure?.[LOCALE]) === adventureId || reverseLinkedIds.has(entry.sys.id),
    )
    .map((entry: ContentfulEntryLike) => ({
      year: getNumberField(entry.fields, "year"),
      month: getTextField(entry.fields, "month"),
      day: getNumberField(entry.fields, "day"),
    }))
    .filter(
      (entry): entry is AdventureEventDate =>
        entry.year !== null && parseMonthIndex(entry.month) !== null && entry.day !== null,
    );

  const sortedAdventureEvents = adventureEvents.sort((left, right) => compareEventDates(left, right));
  const latestEvent = sortedAdventureEvents.length > 0 ? sortedAdventureEvents[sortedAdventureEvents.length - 1] : null;
  const derived = latestEvent
    ? nextCalendarDay({ year: latestEvent.year, month: latestEvent.month, day: latestEvent.day })
    : null;

  return {
    year: explicitYear ?? derived?.year ?? null,
    month: explicitMonth ?? derived?.month ?? null,
    day: explicitDay ?? derived?.day ?? null,
  };
}

function textToRichText(text: string): Record<string, unknown> {
  const paragraphs = text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => ({
      nodeType: "paragraph",
      data: {},
      content: [
        {
          nodeType: "text",
          value: line.trim(),
          marks: [],
          data: {},
        },
      ],
    }));

  return {
    nodeType: "document",
    data: {},
    content: paragraphs,
  };
}

function entryLink(entryId: string): Record<string, unknown> {
  return {
    sys: {
      type: "Link",
      linkType: "Entry",
      id: entryId,
    },
  };
}

function assetLink(assetId: string): Record<string, unknown> {
  return {
    sys: {
      type: "Link",
      linkType: "Asset",
      id: assetId,
    },
  };
}

function textToRichTextWithEmbeddedImages(text: string, embeddedAssetIds: string[] = []): Record<string, unknown> {
  const paragraphs = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({
      nodeType: "paragraph",
      data: {},
      content: [
        {
          nodeType: "text",
          value: line,
          marks: [],
          data: {},
        },
      ],
    }));

  if (embeddedAssetIds.length === 0) {
    return {
      nodeType: "document",
      data: {},
      content: paragraphs,
    };
  }

  const content = [...paragraphs];
  const insertIndex = Math.min(2, content.length);
  content.splice(
    insertIndex,
    0,
    ...embeddedAssetIds.map((embeddedAssetId) => ({
      nodeType: "embedded-asset-block",
      data: {
        target: assetLink(embeddedAssetId),
      },
      content: [],
    })),
  );
  return {
    nodeType: "document",
    data: {},
    content,
  };
}

async function uploadContentfulImage(
  environment: ContentfulEnvironment,
  title: string,
  imagePath: string,
  mimeType: string,
): Promise<{ assetId: string; assetUrl: string | null }> {
  const file = await fs.readFile(imagePath);
  const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  const asset = await environment.createAssetFromFiles({
    fields: {
      title: {
        [LOCALE]: `${title} illustration`,
      },
      description: {
        [LOCALE]: `Generated illustration for ${title}`,
      },
      file: {
        [LOCALE]: {
          contentType: mimeType,
          fileName: path.basename(imagePath),
          file: arrayBuffer,
        },
      },
    },
  });
  const processed = await asset.processForAllLocales();
  const published = await processed.publish();
  return {
    assetId: published.sys.id,
    assetUrl: published.fields.file?.[LOCALE]?.url ?? null,
  };
}

async function appendEventToAdventure(
  environment: ContentfulEnvironment,
  adventureId: string,
  eventId: string,
): Promise<void> {
  const adventure = await environment.getEntry(adventureId);
  const existing = getLinkIds(adventure.fields.events?.[LOCALE]);
  if (existing.includes(eventId)) {
    return;
  }
  const next = [...existing, eventId].map((id) => entryLink(id));
  adventure.fields.events = {
    ...(adventure.fields.events ?? {}),
    [LOCALE]: next,
  };
  await adventure.update();
}

export async function listContentfulCatalog(): Promise<ContentfulCatalog> {
  const environment = await getContentfulEnvironment();
  const [adventures, events, players, characters, locations, npcs] = await Promise.all([
    listEntries(environment, "adventure"),
    listEntries(environment, "event"),
    listEntries(environment, "player"),
    listEntries(environment, "character"),
    listEntries(environment, "location"),
    listEntries(environment, "npc"),
  ]);

  return ContentfulCatalog.parse({
    adventures: adventures
      .map((entry) => ({
        id: entry.sys.id,
        type: "adventure",
        title: getTextField(entry.fields, "title") ?? "Untitled adventure",
        description: richTextToPlainText(entry.fields.description?.[LOCALE]),
        eventIds: getLinkIds(entry.fields.events?.[LOCALE]),
      }))
      .sort((left, right) => left.title.localeCompare(right.title)),
    events: events
      .map((entry) => mapEventReference(entry))
      .sort((left, right) => left.title.localeCompare(right.title)),
    players: players
      .map((entry) => ({
        id: entry.sys.id,
        type: "player",
        title: getTextField(entry.fields, "name") ?? "Untitled player",
      }))
      .sort((left, right) => left.title.localeCompare(right.title)),
    characters: characters
      .map((entry) => ({
        id: entry.sys.id,
        type: "character",
        title: getTextField(entry.fields, "name") ?? "Untitled character",
        subtitle: [getTextField(entry.fields, "race"), getTextField(entry.fields, "class")].filter(Boolean).join(" "),
        description: richTextToPlainText(entry.fields.dmNotes?.[LOCALE]),
        playerId: getLinkId(entry.fields.player?.[LOCALE]),
      }))
      .sort((left, right) => left.title.localeCompare(right.title)),
    locations: locations
      .map((entry) => ({
        id: entry.sys.id,
        type: "location",
        title: getTextField(entry.fields, "title") ?? "Untitled location",
        description: richTextToPlainText(entry.fields.description?.[LOCALE]),
      }))
      .sort((left, right) => left.title.localeCompare(right.title)),
    npcs: npcs
      .map((entry) => ({
        id: entry.sys.id,
        type: "npc",
        title: getTextField(entry.fields, "name") ?? "Untitled NPC",
        subtitle: getTextField(entry.fields, "race"),
        description: richTextToPlainText(entry.fields.description?.[LOCALE]),
      }))
      .sort((left, right) => left.title.localeCompare(right.title)),
    refreshedAt: new Date().toISOString(),
  });
}

export async function buildSubmissionSnapshot(
  selectionInput: ContentfulSubmissionSelection,
): Promise<ContentfulSubmissionSnapshot> {
  const selection = normalizeSubmissionSelection(selectionInput);
  const catalog = await listContentfulCatalog();

  const adventure = catalog.adventures.find((entry) => entry.id === selection.adventureId) ?? null;
  const gameMaster = catalog.players.find((entry) => entry.id === selection.gameMasterPlayerId) ?? null;
  const characterAssignments = resolveSelectedCharacterAssignments(catalog, selection);
  const players = resolveSelectedPlayers(catalog, selection);
  const characters = characterAssignments.map((entry) => entry.character);
  const locations = catalog.locations.filter((entry) => selection.locationIds.includes(entry.id));
  const npcs = catalog.npcs.filter((entry) => selection.npcIds.includes(entry.id));
  const previousEvents = catalog.events.filter((entry) => selection.previousEventIds.includes(entry.id));

  return ContentfulSubmissionSnapshot.parse({
    selection,
    adventure,
    gameMaster,
    players,
    characters,
    characterAssignments,
    locations,
    npcs,
    previousEvents,
  });
}

export function buildSubmissionContextText(snapshot: ContentfulSubmissionSnapshot | null | undefined): string {
  if (!snapshot) {
    return "";
  }

  const sections: string[] = [];
  const dateParts = [snapshot.selection.year, snapshot.selection.month, snapshot.selection.day].filter(
    (value) => value !== null && value !== "",
  );
  if (dateParts.length > 0) {
    sections.push(`In-world event date: ${dateParts.join(" ")}`);
  }
  if (snapshot.adventure) {
    sections.push(`Current adventure: ${snapshot.adventure.title}`);
  }
  if (snapshot.gameMaster) {
    sections.push(`Game master: ${snapshot.gameMaster.title}`);
  }
  if (snapshot.players.length > 0) {
    sections.push(`Players: ${snapshot.players.map((entry) => entry.title).join(", ")}`);
  }
  if (snapshot.characterAssignments.length > 0) {
    sections.push(
      [
        "Characters:",
        ...snapshot.characterAssignments.map(({ character, player }) =>
          formatCharacterAssignmentLine(character, player),
        ),
      ].join("\n"),
    );
  }
  if (snapshot.locations.length > 0) {
    sections.push(["Relevant locations:", ...snapshot.locations.map((entry) => ` - ${entry.title}`)].join("\n"));
  }
  if (snapshot.npcs.length > 0) {
    sections.push(
      [
        "Relevant NPCs:",
        ...snapshot.npcs.map((entry) => ` - ${entry.title}${entry.subtitle ? `: ${entry.subtitle}` : ""}`),
      ].join("\n"),
    );
  }
  if (snapshot.previousEvents.length > 0) {
    sections.push(
      [
        "Previous events in this adventure:",
        ...snapshot.previousEvents.map((entry) => ` - ${entry.title}${entry.summary ? `: ${entry.summary}` : ""}`),
      ].join("\n"),
    );
  }

  return sections.join("\n\n").trim();
}

export async function createContentfulEvent(input: {
  title: string;
  summary: string;
  description: string;
  dmNotes: string;
  songUrl?: string | null;
  adventureId?: string | null;
  locationIds?: string[];
  characterIds?: string[];
  npcIds?: string[];
  year?: number | null;
  month?: string | null;
  day?: number | null;
  images?: Array<{ imagePath: string; imageMimeType: string }>;
}): Promise<{ entryId: string; entryUrl: string; assetIds: string[]; assetUrls: string[] }> {
  const environment = await getContentfulEnvironment();
  const eventDate = await deriveEventDate(environment, input.adventureId, {
    year: input.year,
    month: input.month,
    day: input.day,
  });
  const uploadedAssets = await Promise.all(
    (input.images ?? []).map(({ imagePath, imageMimeType }) =>
      uploadContentfulImage(environment, input.title, imagePath, imageMimeType),
    ),
  );
  const assetIds = uploadedAssets.map((asset) => asset.assetId);
  const assetUrls = uploadedAssets.map((asset) => asset.assetUrl).filter((value): value is string => Boolean(value));

  const entry = await environment.createEntry("event", {
    fields: {
      title: { [LOCALE]: input.title },
      songUrl: { [LOCALE]: input.songUrl ?? "" },
      summary: { [LOCALE]: textToRichText(input.summary) },
      description: { [LOCALE]: textToRichTextWithEmbeddedImages(input.description, assetIds) },
      dmNotes: { [LOCALE]: textToRichText(input.dmNotes) },
      year: eventDate.year ? { [LOCALE]: eventDate.year } : undefined,
      month: eventDate.month ? { [LOCALE]: eventDate.month } : undefined,
      day: eventDate.day ? { [LOCALE]: eventDate.day } : undefined,
      location: { [LOCALE]: (input.locationIds ?? []).map((id) => entryLink(id)) },
      adventure: input.adventureId ? { [LOCALE]: entryLink(input.adventureId) } : undefined,
      involvement: { [LOCALE]: (input.characterIds ?? []).map((id) => entryLink(id)) },
      npcInvolvement: { [LOCALE]: (input.npcIds ?? []).map((id) => entryLink(id)) },
    },
  });

  if (input.adventureId) {
    await appendEventToAdventure(environment, input.adventureId, entry.sys.id);
  }

  return {
    entryId: entry.sys.id,
    entryUrl: `https://app.contentful.com/spaces/${env.CONTENTFUL_SPACE_ID}/entries/${entry.sys.id}`,
    assetIds,
    assetUrls,
  };
}
