import z from "zod";
import { AbstractService, NoBodyParams, NoPathParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";

export const DownloadBookResponse = z.object({
  success: z.boolean(),
});
export type DownloadBookResponse = z.infer<typeof DownloadBookResponse>;

export class DownloadBookService extends AbstractService<NoBodyParams, NoPathParams, DownloadBookResponse> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.get;
  readonly path = "/api/book/:book/download.docx";

  override async fetch(params: NoPathParams | NoBodyParams): Promise<DownloadBookResponse> {
    const response = await fetch(`/api/book/${params.book}/download.docx`);
    if (!response.ok) {
      throw new Error("Failed to download DOCX");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${params.book}.docx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    return { success: true };
  }
}

export const downloadBookService = new DownloadBookService(NoBodyParams, NoPathParams, DownloadBookResponse);
