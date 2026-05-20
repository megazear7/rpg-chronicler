import { RequestOptions } from "../shared/main.service.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { SelectJobSongBody, selectJobSongService } from "../shared/service.select-job-song.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { readJobDetail, selectSong, updateStage } from "./util.job-store.js";

export class SelectJobSongController extends AbstractController<SelectJobSongBody, JobPathParameters, JobDetail> {
  async handler({ bodyParams, pathParams }: RequestOptions<SelectJobSongBody, JobPathParameters>): Promise<JobDetail> {
    await selectSong(pathParams.jobId, bodyParams.songUrl, bodyParams.provider, bodyParams.externalSongId ?? null);
    await updateStage(
      pathParams.jobId,
      "contentful",
      "running",
      20,
      "Ready for Contentful publish after final review.",
    );
    return readJobDetail(pathParams.jobId);
  }
}

export const selectJobSongController = new SelectJobSongController(selectJobSongService);
