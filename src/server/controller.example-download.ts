import { Router } from "express";
import { downloadBookService } from "../shared/service.example-download.js";
import { createReadStream } from "fs";

export async function registerExampleDownload(router: Router): Promise<void> {
  router.get(downloadBookService.path, async (req, res) => {
    try {
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${req.params.book}.docx"`);
      const stream = createReadStream(`data/example.docx`);
      stream.pipe(res);
    } catch (error) {
      console.error("Error generating DOCX:", error);
      res.status(500).send("Error generating DOCX file");
    }
  });
}
