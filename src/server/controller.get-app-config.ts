import { NoBodyParams } from "../shared/main.service.js";
import { GetAppConfigPathParameters, getAppConfigService } from "../shared/service.get-app-config.js";
import { AppConfig } from "../shared/type.app.js";
import { AbstractController } from "./main.controller.js";
import { getAppConfig } from "./util.app.js";

export class GetAppConfigController extends AbstractController<NoBodyParams, GetAppConfigPathParameters, AppConfig> {
  async handler(): Promise<AppConfig> {
    return getAppConfig();
  }
}

export const getAppConfigController = new GetAppConfigController(getAppConfigService);
