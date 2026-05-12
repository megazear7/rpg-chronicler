import { AbstractService, NoBodyParams, NoPathParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { Health } from "./type.health.js";

export class HealthService extends AbstractService<NoBodyParams, NoPathParams, Health> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.get;
  readonly path = "/api/health";
}

export const healthService = new HealthService(NoBodyParams, NoPathParams, Health);
