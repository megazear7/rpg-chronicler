import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { ArtifactVersionPathParameters } from "../shared/service.activate-artifact-version.js";
import { deleteArtifactVersionService } from "../shared/service.delete-artifact-version.js";
import { ArtifactDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { deleteArtifactVersion } from "./util.job-store.js";

export class DeleteArtifactVersionController extends AbstractController<NoBodyParams, ArtifactVersionPathParameters, ArtifactDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, ArtifactVersionPathParameters>): Promise<ArtifactDetail> {
    return deleteArtifactVersion(pathParams.jobId, pathParams.artifactKey, pathParams.versionId);
  }
}

export const deleteArtifactVersionController = new DeleteArtifactVersionController(deleteArtifactVersionService);