import { Request, Response, Router } from "express";
import { parseRouteParams } from "../shared/util.route-params.js";
import { streamJobService } from "../shared/service.stream-job.js";
import { streamJobsService } from "../shared/service.stream-jobs.js";
import { JobPathParameters } from "../shared/service.get-job.js";
import { ListJobsPathParameters } from "../shared/service.list-jobs.js";
import { listJobs, readJobDetail } from "./util.job-store.js";
import z from "zod";

function prepareSse(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

function writeEvent(res: Response, event: string, payload: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function streamWithPolling<T>(
  req: Request,
  res: Response,
  reader: () => Promise<T>,
  event: string,
): Promise<void> {
  prepareSse(res);
  let lastPayload = "";

  const sendCurrent = async (): Promise<void> => {
    const payload = await reader();
    const encoded = JSON.stringify(payload);
    if (encoded !== lastPayload) {
      lastPayload = encoded;
      writeEvent(res, event, payload);
    }
  };

  await sendCurrent();
  const interval = setInterval(() => {
    void sendCurrent().catch((error: unknown) => {
      writeEvent(res, "error", { error: error instanceof Error ? error.message : String(error) });
    });
  }, 1000);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
}

export async function registerJobStreams(router: Router): Promise<void> {
  router.get(streamJobsService.path, async (req, res, next) => {
    try {
      const params = ListJobsPathParameters.parse(parseRouteParams(streamJobsService.path, req.path));
      await streamWithPolling(
        req,
        res,
        () => listJobs(z.coerce.number().int().positive().parse(params.page), z.coerce.number().int().positive().parse(params.pageSize)),
        "jobs",
      );
    } catch (error) {
      next(error);
    }
  });

  router.get(streamJobService.path, async (req, res, next) => {
    try {
      const params = JobPathParameters.parse(parseRouteParams(streamJobService.path, req.path));
      await streamWithPolling(req, res, () => readJobDetail(params.jobId), "job");
    } catch (error) {
      next(error);
    }
  });
}