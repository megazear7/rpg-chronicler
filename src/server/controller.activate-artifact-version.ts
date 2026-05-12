import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import {
  activateArtifactVersionService,
  ArtifactVersionPathParameters,
} from "../shared/service.activate-artifact-version.js";
import { ArtifactDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { activateArtifactVersion } from "./util.job-store.js";

export class ActivateArtifactVersionController extends AbstractController<NoBodyParams, ArtifactVersionPathParameters, ArtifactDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, ArtifactVersionPathParameters>): Promise<ArtifactDetail> {
    return activateArtifactVersion(pathParams.jobId, pathParams.artifactKey, pathParams.versionId);
  }
}

export const activateArtifactVersionController = new ActivateArtifactVersionController(activateArtifactVersionService);