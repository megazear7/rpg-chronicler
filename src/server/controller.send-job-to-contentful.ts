import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { sendJobToContentfulService } from "../shared/service.send-job-to-contentful.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { RouteError } from "./main.errors.js";
import { createContentfulEvent } from "./util.contentful.js";
import { readJobDetail, updateJob, updateStage } from "./util.job-store.js";

export class SendJobToContentfulController extends AbstractController<NoBodyParams, JobPathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobPathParameters>): Promise<JobDetail> {
    const current = await readJobDetail(pathParams.jobId);
    if (current.contentful.entryId || current.contentful.entryUrl || current.contentful.status === "sent") {
      throw new RouteError(400, "This job has already been sent to Contentful.");
    }
    if (!current.contentful.title || !current.contentful.summary || !current.contentful.story || !current.contentful.dmNotes) {
      throw new RouteError(400, "Title, summary, story, and DM notes must be available before sending to Contentful.");
    }

    await updateJob(pathParams.jobId, (job) => ({
      ...job,
      contentful: {
        ...job.contentful,
        status: "sending",
      },
    }));
    await updateStage(pathParams.jobId, "contentful", "running", 50, "Sending approved content to Contentful.");

    const contentfulEntry = await createContentfulEvent(
      current.contentful.title,
      current.contentful.summary,
      current.contentful.story,
      current.contentful.dmNotes,
    );

    await updateJob(pathParams.jobId, (job) => ({
      ...job,
      contentful: {
        ...job.contentful,
        status: "sent",
        entryId: contentfulEntry.entryId,
        entryUrl: contentfulEntry.entryUrl,
        sentAt: new Date().toISOString(),
      },
    }));
    await updateStage(pathParams.jobId, "contentful", "completed", 100, "Sent to Contentful.");

    return readJobDetail(pathParams.jobId);
  }
}

export const sendJobToContentfulController = new SendJobToContentfulController(sendJobToContentfulService);