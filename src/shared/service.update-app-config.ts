import { AbstractService, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { AppConfig } from "./type.app.js";
import z from "zod";

export const UpdateAppConfigPathParameters = z.object({});
export type UpdateAppConfigPathParameters = z.infer<typeof UpdateAppConfigPathParameters>;

export class UpdateAppConfigService extends AbstractService<AppConfig, UpdateAppConfigPathParameters, AppConfig> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.put;
  readonly path = "/api/app";
}

export const updateAppConfigService = new UpdateAppConfigService(AppConfig, UpdateAppConfigPathParameters, AppConfig);
