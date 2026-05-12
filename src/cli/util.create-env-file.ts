import { AppConfig } from "../shared/type.app.js";

export function createEnvFile(config: AppConfig, port: string, textApiKey: string, audioApiKey: string): string {
  return `
${config.model.text.name.toUpperCase()}_MODEL_API_KEY=${textApiKey}
${config.model.audio.name.toUpperCase()}_MODEL_API_KEY=${audioApiKey}
APP_PORT=${port}
`.trim();
}
