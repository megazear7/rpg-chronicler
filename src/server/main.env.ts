import { config } from "dotenv";
import { z } from "zod";

config();

export const Env = z.object({
  APP_PORT: z.string().default("3000").describe("The port the server listens on."),
});
export type Env = z.infer<typeof Env>;

export const env = Env.parse(process.env);

export function getEnvVariable(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value) return value;
  throw new Error(`Environment variable ${key} is not set and no default value provided.`);
}
