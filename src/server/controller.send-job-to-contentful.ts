import { NoBodyParams, RequestOptions } from "../shared/main.service.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { sendJobToContentfulService } from "../shared/service.send-job-to-contentful.js";
import { JobDetail } from "../shared/type.job.js";
import { AbstractController } from "./main.controller.js";
import { RouteError } from "./main.errors.js";
import { createContentfulEvent } from "./util.contentful.js";
import { markNotionReady, readJobDetail, updateJob, updateStage, getJobImagePath } from "./util.job-store.js";

export class SendJobToContentfulController extends AbstractController<NoBodyParams, JobPathParameters, JobDetail> {
  async handler({ pathParams }: RequestOptions<NoBodyParams, JobPathParameters>): Promise<JobDetail> {
    const current = await readJobDetail(pathParams.jobId);
    if (current.contentful.entryId || current.contentful.entryUrl || current.contentful.status === "sent") {
      throw new RouteError(400, "This job has already been sent to Contentful.");
    }
    if (
      !current.contentful.title ||
      !current.contentful.summary ||
      !current.contentful.story ||
      !current.contentful.dmNotes
    ) {
      throw new RouteError(400, "Title, summary, story, and DM notes must be available before sending to Contentful.");
    }
    if (!current.song.songUrl) {
      throw new RouteError(400, "Choose a song before sending this event to Contentful.");
    }

    if (current.stages.find((stage) => stage.name === "image_approval")?.status !== "completed") {
      throw new RouteError(400, "Approve or reject all generated images before sending this event to Contentful.");
    }

    const approvedImages = current.image.generatedAssets.filter((asset) => asset.approvedAt && !asset.rejectedAt);

    await updateJob(pathParams.jobId, (job) => ({
      ...job,
      contentful: {
        ...job.contentful,
        status: "sending",
      },
    }));
    await updateStage(pathParams.jobId, "contentful", "running", 50, "Sending approved content to Contentful.");

    const contentfulEntry = await createContentfulEvent({
      title: current.contentful.title,
      summary: current.contentful.summary,
      description: current.contentful.story,
      dmNotes: current.contentful.dmNotes,
      songUrl: current.song.songUrl,
      adventureId: current.submission?.adventure?.id ?? current.submission?.selection.adventureId ?? null,
      locationIds: current.submission?.locations.map((entry) => entry.id) ?? [],
      characterIds: current.submission?.characters.map((entry) => entry.id) ?? [],
      npcIds: current.submission?.npcs.map((entry) => entry.id) ?? [],
      year: current.submission?.selection.year ?? null,
      month: current.submission?.selection.month ?? null,
      day: current.submission?.selection.day ?? null,
      images: approvedImages.map((image) => ({
        imagePath: getJobImagePath(pathParams.jobId, image.fileName),
        imageMimeType: image.mimeType,
      })),
    });

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
    await markNotionReady(pathParams.jobId);
    await updateStage(pathParams.jobId, "notion", "running", 50, "Ready to send DM notes to Notion.");

    return readJobDetail(pathParams.jobId);
  }
}

export const sendJobToContentfulController = new SendJobToContentfulController(sendJobToContentfulService);
