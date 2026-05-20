import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { ArtifactPathParameters, getArtifactService } from "../shared/service.get-artifact.js";
import { ArtifactDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { readArtifact } from "./util.job-store.js";

export class GetArtifactController extends AbstractController<NoBodyParams, ArtifactPathParameters, ArtifactDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, ArtifactPathParameters>): Promise<ArtifactDetail> {
    return readArtifact(pathParams.jobId, pathParams.artifactKey);
  }
}

export const getArtifactController = new GetArtifactController(getArtifactService);
