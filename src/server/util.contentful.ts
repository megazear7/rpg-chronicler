import pkg from "contentful-management";
import { env } from "./main.env.js";

const { createClient } = pkg;

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

export async function createContentfulEvent(
  title: string,
  summary: string,
  description: string,
  dmNotes: string,
): Promise<{ entryId: string; entryUrl: string }> {
  const client = createClient({
    accessToken: env.CONTENTFUL_MANAGEMENT_API_KEY,
  });
  const space = await client.getSpace(env.CONTENTFUL_SPACE_ID);
  const environment = await space.getEnvironment("master");
  const entry = await environment.createEntry("event", {
    fields: {
      title: { "en-US": title },
      summary: { "en-US": textToRichText(summary) },
      description: { "en-US": textToRichText(description) },
      dmNotes: { "en-US": textToRichText(dmNotes) },
    },
  });

  return {
    entryId: entry.sys.id,
    entryUrl: `https://app.contentful.com/spaces/${env.CONTENTFUL_SPACE_ID}/entries/${entry.sys.id}`,
  };
}