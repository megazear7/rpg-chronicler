import { AppConfig } from "../shared/type.app.js";
import { promises as fs } from "fs";
import { fileExists } from "./util.fs.js";
import { RouteError } from "./main.errors.js";

export const getAppConfig = async (): Promise<AppConfig> => {
  const path = "data/app/index.json";
  const exists = await fileExists(path);
  if (!exists) throw new RouteError(404, "App config does not exist.");
  const data = await fs.readFile(path, "utf-8");
  const json = JSON.parse(data);
  return AppConfig.parse(json);
};

export const saveAppConfig = async (app: AppConfig): Promise<void> => {
  const path = "data/app/index.json";
  await fs.mkdir("data/app", { recursive: true });
  await fs.writeFile(path, JSON.stringify(app, null, 2), "utf-8");
};
