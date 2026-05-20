import z from "zod";
import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { ArtifactDetail, ArtifactKey } from "./type.job.js";

export const ArtifactVersionPathParameters = z.object({
  jobId: z.uuid(),
  artifactKey: ArtifactKey,
  versionId: z.uuid(),
});
export type ArtifactVersionPathParameters = z.infer<typeof ArtifactVersionPathParameters>;

export class ActivateArtifactVersionService extends AbstractService<
  NoBodyParams,
  ArtifactVersionPathParameters,
  ArtifactDetail
> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.post;
  readonly path = "/api/jobs/:jobId/artifacts/:artifactKey/versions/:versionId/activate";
}

export const activateArtifactVersionService = new ActivateArtifactVersionService(
  NoBodyParams,
  ArtifactVersionPathParameters,
  ArtifactDetail,
);
