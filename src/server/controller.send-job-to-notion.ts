import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { sendJobToNotionService } from "../shared/service.send-job-to-notion.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { RouteError } from "./main.errors.js";
import { createDmNotesPage } from "./util.notion.js";
import { readJobDetail, updateJob, updateStage } from "./util.job-store.js";

export class SendJobToNotionController extends AbstractController<NoBodyParams, JobPathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobPathParameters>): Promise<JobDetail> {
    const current = await readJobDetail(pathParams.jobId);
    if (!current.contentful.entryUrl) {
      throw new RouteError(400, "Publish the event to Contentful before sending DM notes to Notion.");
    }
    if (!current.contentful.dmNotes) {
      throw new RouteError(400, "DM notes must be available before sending them to Notion.");
    }

    await updateJob(pathParams.jobId, (job) => ({
      ...job,
      notion: {
        ...job.notion,
        status: "sending",
      },
    }));
    await updateStage(pathParams.jobId, "notion", "running", 50, "Sending DM notes to Notion.");

    try {
      const notionPage = await createDmNotesPage({
        title: current.contentful.title ?? current.file,
        adventureTitle: current.submission?.adventure?.title ?? null,
        dmNotes: current.contentful.dmNotes,
        story: current.contentful.story,
        contentfulUrl: current.contentful.entryUrl,
      });

      await updateJob(pathParams.jobId, (job) => ({
        ...job,
        notion: {
          ...job.notion,
          status: "sent",
          pageId: notionPage.pageId,
          pageUrl: notionPage.pageUrl,
          sentAt: new Date().toISOString(),
        },
      }));
      await updateStage(pathParams.jobId, "notion", "completed", 100, "Sent DM notes to Notion.");
      return readJobDetail(pathParams.jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send DM notes to Notion.";
      await updateJob(pathParams.jobId, (job) => ({
        ...job,
        notion: {
          ...job.notion,
          status: "failed",
        },
      }));
      await updateStage(pathParams.jobId, "notion", "failed", 0, message);
      throw error;
    }
  }
}

export const sendJobToNotionController = new SendJobToNotionController(sendJobToNotionService);
