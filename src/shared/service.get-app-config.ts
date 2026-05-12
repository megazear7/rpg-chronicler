import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { AppConfig } from "./type.app.js";
import z from "zod";

export const GetAppConfigPathParameters = z.object({});
export type GetAppConfigPathParameters = z.infer<typeof GetAppConfigPathParameters>;

export class GetAppConfigService extends AbstractService<NoBodyParams, GetAppConfigPathParameters, AppConfig> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.get;
  readonly path = "/api/app";
}
export const getAppConfigService = new GetAppConfigService(NoBodyParams, GetAppConfigPathParameters, AppConfig);
