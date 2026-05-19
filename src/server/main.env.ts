import { config } from "dotenv";
import { z } from "zod";

config();

export const Env = z.object({
  APP_PORT: z.string().default("3000").describe("The port the server listens on."),
  GROK_MODEL_API_KEY: z.string().describe("API key for the Grok model."),
  OPENAI_MODEL_API_KEY: z.string().describe("API key for OpenAI models."),
  CONTENTFUL_SPACE_ID: z.string().describe("Contentful Space ID."),
  CONTENTFUL_MANAGEMENT_API_KEY: z.string().describe("Contentful Management API Key."),
  CONTENTFUL_ENVIRONMENT_ID: z.string().default("master").describe("Contentful environment ID."),
  SUNO_API_KEY: z.string().optional().describe("Optional Suno API key."),
  SUNO_API_BASE_URL: z.string().optional().describe("Optional Suno API base URL."),
  NOTION_API_KEY: z.string().optional().describe("Optional Notion API key."),
  NOTION_DATABASE_ID: z.string().optional().describe("Optional Notion database ID for DM notes."),
  NOTION_PARENT_PAGE_ID: z.string().optional().describe("Optional Notion parent page ID or page URL for DM notes."),
});
export type Env = z.infer<typeof Env>;

export const env = Env.parse(process.env);

export function getEnvVariable(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value) return value;
  throw new Error(`Environment variable ${key} is not set and no default value provided.`);
}
