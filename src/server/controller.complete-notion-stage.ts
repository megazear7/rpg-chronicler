import { RequestOptions } from "../shared/main.service.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { completeNotionStageService, CompleteNotionStageBody } from "../shared/service.complete-notion-stage.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { RouteError } from "./main.errors.js";
import { readJobDetail, setNotionPageReference, updateStage } from "./util.job-store.js";

function formatNotionPageId(value: string): string {
  const compact = value.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(compact)) {
    throw new RouteError(400, "Paste a valid Notion page URL or page ID.");
  }
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

function resolveNotionPageReference(reference: string): { pageId: string; pageUrl: string } {
  const trimmed = reference.trim();
  const dashedMatch = trimmed.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (dashedMatch) {
    const pageId = formatNotionPageId(dashedMatch[0]);
    return { pageId, pageUrl: `https://www.notion.so/${pageId.replace(/-/g, "")}` };
  }

  const compactMatch = trimmed.match(/([0-9a-fA-F]{32})(?:\?|$|\/)/);
  if (compactMatch) {
    const pageId = formatNotionPageId(compactMatch[1]);
    return { pageId, pageUrl: `https://www.notion.so/${pageId.replace(/-/g, "")}` };
  }

  throw new RouteError(400, "Paste a valid Notion page URL or page ID.");
}

export class CompleteNotionStageController extends AbstractController<
  CompleteNotionStageBody,
  JobPathParameters,
  JobDetail
> {
  async handler({
    bodyParams,
    pathParams,
  }: RequestOptions<CompleteNotionStageBody, JobPathParameters>): Promise<JobDetail> {
    const { pageId, pageUrl } = resolveNotionPageReference(bodyParams.reference);
    await setNotionPageReference(pathParams.jobId, pageId, pageUrl);
    await updateStage(pathParams.jobId, "notion", "completed", 100, "Notion page linked manually.");
    return readJobDetail(pathParams.jobId);
  }
}

export const completeNotionStageController = new CompleteNotionStageController(completeNotionStageService);
