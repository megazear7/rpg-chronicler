import z from "zod";
import { AbstractService, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { ArtifactDetail } from "./type.job.js";
import { ArtifactPathParameters } from "./service.get-artifact.js";

export const UpdateArtifactBodyParameters = z.object({
  text: z.string().min(1),
});
export type UpdateArtifactBodyParameters = z.infer<typeof UpdateArtifactBodyParameters>;

export class UpdateArtifactService extends AbstractService<UpdateArtifactBodyParameters, ArtifactPathParameters, ArtifactDetail> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.put;
  readonly path = "/api/jobs/:jobId/artifacts/:artifactKey";
}

export const updateArtifactService = new UpdateArtifactService(
  UpdateArtifactBodyParameters,
  ArtifactPathParameters,
  ArtifactDetail,
);