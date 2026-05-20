import { AbstractService, NoBodyParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { ArtifactDetail } from "./type.job.js";
import { ArtifactVersionPathParameters } from "./service.activate-artifact-version.js";

export class DeleteArtifactVersionService extends AbstractService<
  NoBodyParams,
  ArtifactVersionPathParameters,
  ArtifactDetail
> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.delete;
  readonly path = "/api/jobs/:jobId/artifacts/:artifactKey/versions/:versionId";
}

export const deleteArtifactVersionService = new DeleteArtifactVersionService(
  NoBodyParams,
  ArtifactVersionPathParameters,
  ArtifactDetail,
);
