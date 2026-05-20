import { RequestOptions } from "../shared/main.service.js";
import { ArtifactPathParameters } from "../shared/service.get-artifact.js";
import { UpdateArtifactBodyParameters, updateArtifactService } from "../shared/service.update-artifact.js";
import { ArtifactDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { editArtifact } from "./util.job-store.js";

export class UpdateArtifactController extends AbstractController<
  UpdateArtifactBodyParameters,
  ArtifactPathParameters,
  ArtifactDetail
> {
  async handler({
    bodyParams,
    pathParams,
  }: RequestOptions<UpdateArtifactBodyParameters, ArtifactPathParameters>): Promise<ArtifactDetail> {
    return editArtifact(pathParams.jobId, pathParams.artifactKey, bodyParams.text);
  }
}

export const updateArtifactController = new UpdateArtifactController(updateArtifactService);
