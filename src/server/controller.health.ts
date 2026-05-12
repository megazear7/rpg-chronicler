import { NoBodyParams, NoPathParams } from "../shared/main.service.js";
import { healthService } from "../shared/service.health.js";
import { Health } from "../shared/type.health.js";
import { AbstractController } from "./main.controller.js";

export class HealthController extends AbstractController<NoBodyParams, NoPathParams, Health> {
  async handler(): Promise<Health> {
    return { healthy: true };
  }
}

export const healthController = new HealthController(healthService);
