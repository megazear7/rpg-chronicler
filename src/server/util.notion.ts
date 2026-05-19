import { Client } from "@notionhq/client";
import { env } from "./main.env.js";

const DEFAULT_NOTION_PARENT_PAGE = "https://www.notion.so/Heroic-Adventures-35d290435c2f804c8748f861c9151044?source=copy_link";

function getNotionClient(): Client {
  if (!env.NOTION_API_KEY) {
    throw new Error("NOTION_API_KEY is not configured.");
  }
  return new Client({ auth: env.NOTION_API_KEY });
}

function markdownParagraphs(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => ({
      object: "block" as const,
      type: "paragraph" as const,
      paragraph: {
        rich_text: [
          {
            type: "text" as const,
            text: {
              content: paragraph,
            },
          },
        ],
      },
    }));
}

function notionPageUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replace(/-/g, "")}`;
}

function formatNotionPageId(value: string): string {
  const compact = value.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(compact)) {
    throw new Error("Invalid Notion page identifier.");
  }
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

function resolveNotionParentPageId(): string | null {
  const configured = env.NOTION_PARENT_PAGE_ID ?? DEFAULT_NOTION_PARENT_PAGE;
  if (!configured) {
    return null;
  }

  const directMatch = configured.match(/[0-9a-fA-F]{32}$/);
  if (directMatch) {
    return formatNotionPageId(directMatch[0]);
  }

  const urlMatch = configured.match(/([0-9a-fA-F]{32})(?:\?|$)/);
  if (urlMatch) {
    return formatNotionPageId(urlMatch[1]);
  }

  return formatNotionPageId(configured);
}

export async function createDmNotesPage(input: {
  title: string;
  adventureTitle?: string | null;
  dmNotes: string;
  story?: string | null;
  contentfulUrl?: string | null;
}): Promise<{ pageId: string; pageUrl: string }> {
  const notion = getNotionClient();
  const title = input.adventureTitle ? `${input.title} (${input.adventureTitle})` : input.title;
  const blocks = [
    ...markdownParagraphs(input.dmNotes),
    ...(input.story ? markdownParagraphs(`Story Summary\n\n${input.story}`) : []),
    ...(input.contentfulUrl ? markdownParagraphs(`Contentful Entry\n\n${input.contentfulUrl}`) : []),
  ];

  if (env.NOTION_DATABASE_ID) {
    const database = (await notion.databases.retrieve({ database_id: env.NOTION_DATABASE_ID })) as {
      properties?: Record<string, { type?: string }>;
    };
    const titleProperty = Object.entries(database.properties ?? {}).find(([, value]) => value.type === "title");
    if (!titleProperty) {
      throw new Error("The configured Notion database does not have a title property.");
    }
    const [titlePropertyName] = titleProperty;
    const response = await notion.pages.create({
      parent: {
        database_id: env.NOTION_DATABASE_ID,
      },
      properties: {
        [titlePropertyName]: {
          title: [
            {
              type: "text",
              text: {
                content: title,
              },
            },
          ],
        },
      },
      children: blocks,
    });
    return {
      pageId: response.id,
      pageUrl: notionPageUrl(response.id),
    };
  }

  const parentPageId = resolveNotionParentPageId();
  if (!parentPageId) {
    throw new Error("Configure NOTION_DATABASE_ID or NOTION_PARENT_PAGE_ID before sending DM notes to Notion.");
  }

  const response = await notion.pages.create({
    parent: {
      page_id: parentPageId,
    },
    properties: {
      title: {
        title: [
          {
            type: "text",
            text: {
              content: title,
            },
          },
        ],
      },
    },
    children: blocks,
  });
  return {
    pageId: response.id,
    pageUrl: notionPageUrl(response.id),
  };
}