import { AppConfig } from "../shared/type.app.js";
import { UpdateAppConfigPathParameters, updateAppConfigService } from "../shared/service.update-app-config.js";
import { AbstractController } from "./main.controller.js";
import { saveAppConfig } from "./util.app.js";

export class UpdateAppConfigController extends AbstractController<AppConfig, UpdateAppConfigPathParameters, AppConfig> {
  async handler({
    bodyParams,
  }: {
    bodyParams: AppConfig;
    pathParams: UpdateAppConfigPathParameters;
  }): Promise<AppConfig> {
    const config = AppConfig.parse(bodyParams);
    await saveAppConfig(config);
    return config;
  }
}

export const updateAppConfigController = new UpdateAppConfigController(updateAppConfigService);
