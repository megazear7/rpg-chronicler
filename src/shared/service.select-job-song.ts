import z from "zod";
import { AbstractService, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { JobDetail } from "./type.job.js";
import { JobPathParameters } from "./service.get-job.js";

export const SelectJobSongBody = z.object({
  songUrl: z.string().url(),
  provider: z.enum(["manual", "suno"]).default("manual"),
  externalSongId: z.string().nullable().optional(),
});
export type SelectJobSongBody = z.infer<typeof SelectJobSongBody>;

export class SelectJobSongService extends AbstractService<SelectJobSongBody, JobPathParameters, JobDetail> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.put;
  readonly path = "/api/jobs/:jobId/song";
}

export const selectJobSongService = new SelectJobSongService(SelectJobSongBody, JobPathParameters, JobDetail);