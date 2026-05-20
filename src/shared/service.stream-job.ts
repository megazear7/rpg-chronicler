import z from "zod";
import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobPathParameters } from "./service.get-job.js";

export class StreamJobService extends AbstractService<NoBodyParams, JobPathParameters, string> {
  readonly type = ServiceType.enum.html;
  readonly method = HttpMethod.enum.get;
  readonly path = "/api/jobs/:jobId/stream";
}

export const streamJobService = new StreamJobService(NoBodyParams, JobPathParameters, z.string());
