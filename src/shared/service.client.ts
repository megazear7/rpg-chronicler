import z from "zod";
import { AbstractService, NoBodyParams, NoPathParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { RouteName } from "./type.routes.js";

export const routes = [
  {
    name: RouteName.enum.home,
    path: "/",
  },
  {
    name: RouteName.enum.instructions,
    path: "/instructions",
  },
  {
    name: RouteName.enum.jobs,
    path: "/jobs",
  },
  {
    name: RouteName.enum.job,
    path: "/jobs/:jobId",
  },
  {
    name: RouteName.enum.job_stage,
    path: "/jobs/:jobId/stage/:stageSlug",
  },
  {
    name: RouteName.enum.job_logs,
    path: "/jobs/:jobId/logs",
  },
  {
    name: RouteName.enum.example,
    path: "/example/:id",
  },
];

export class ClientService extends AbstractService<NoBodyParams, NoPathParams, string> {
  readonly type = ServiceType.enum.html;
  readonly method = HttpMethod.enum.get;
  readonly path = routes.map((route) => route.path);
}

export const clientService = new ClientService(NoBodyParams, NoPathParams, z.string());
