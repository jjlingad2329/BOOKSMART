import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);
type PdfParseResult = { text: string; numpages: number };
const pdfParse = _require("pdf-parse") as (buf: Buffer) => Promise<PdfParseResult>;

const router = Router();

/**
 * POST /api/extract-text
 * Body: { fileData: string }  — base64 data-URL of a PDF
 * Returns: { text: string, isScanned: boolean }
 *
 * Used by the frontend to extract raw text from a PDF before inserting it into
 * statement_imports.extracted_text so n8n can forward it to GPT.
 */
router.post("/extract-text", requireAuth, async (req, res) => {
  try {
    const { fileData } = req.body as { fileData?: string };
    if (!fileData) {
      res.status(400).json({ error: "fileData is required" });
      return;
    }

    const base64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
    const buffer = Buffer.from(base64, "base64");

    let text = "";
    try {
      const result = await pdfParse(buffer);
      text = (result.text ?? "").trim();
    } catch {
      text = "";
    }

    const isScanned = text.length < 50;
    res.json({ text, isScanned });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;
