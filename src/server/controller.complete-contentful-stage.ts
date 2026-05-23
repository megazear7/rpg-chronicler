import { RequestOptions } from "../shared/main.service.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import {
  completeContentfulStageService,
  CompleteContentfulStageBody,
} from "../shared/service.complete-contentful-stage.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { RouteError } from "./main.errors.js";
import { env } from "./main.env.js";
import { markNotionReady, readJobDetail, setContentfulEntryReference, updateStage } from "./util.job-store.js";

function resolveContentfulEntryReference(reference: string): { entryId: string; entryUrl: string } {
  const trimmed = reference.trim();
  const entryMatch = trimmed.match(/\/entries\/([A-Za-z0-9]+)(?:[/?#]|$)/);
  if (entryMatch) {
    return {
      entryId: entryMatch[1],
      entryUrl: trimmed,
    };
  }

  if (/^[A-Za-z0-9]+$/.test(trimmed)) {
    return {
      entryId: trimmed,
      entryUrl: `https://app.contentful.com/spaces/${env.CONTENTFUL_SPACE_ID}/entries/${trimmed}`,
    };
  }

  throw new RouteError(400, "Paste a valid Contentful entry URL or entry ID.");
}

export class CompleteContentfulStageController extends AbstractController<
  CompleteContentfulStageBody,
  JobPathParameters,
  JobDetail
> {
  async handler({
    bodyParams,
    pathParams,
  }: RequestOptions<CompleteContentfulStageBody, JobPathParameters>): Promise<JobDetail> {
    const { entryId, entryUrl } = resolveContentfulEntryReference(bodyParams.reference);
    await setContentfulEntryReference(pathParams.jobId, entryId, entryUrl);
    await updateStage(pathParams.jobId, "contentful", "completed", 100, "Contentful entry linked manually.");
    await markNotionReady(pathParams.jobId);
    await updateStage(pathParams.jobId, "notion", "running", 50, "Ready to send DM notes to Notion.");
    return readJobDetail(pathParams.jobId);
  }
}

export const completeContentfulStageController = new CompleteContentfulStageController(completeContentfulStageService);
