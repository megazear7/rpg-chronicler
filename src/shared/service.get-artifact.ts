import z from "zod";
import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { ArtifactDetail, ArtifactKey } from "./type.job.js";

export const ArtifactPathParameters = z.object({
  jobId: z.uuid(),
  artifactKey: ArtifactKey,
});
export type ArtifactPathParameters = z.infer<typeof ArtifactPathParameters>;

export class GetArtifactService extends AbstractService<NoBodyParams, ArtifactPathParameters, ArtifactDetail> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.get;
  readonly path = "/api/jobs/:jobId/artifacts/:artifactKey";
}

export const getArtifactService = new GetArtifactService(NoBodyParams, ArtifactPathParameters, ArtifactDetail);
