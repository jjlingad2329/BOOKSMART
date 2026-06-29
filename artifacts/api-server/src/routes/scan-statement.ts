import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);
type PdfParseResult = { text: string; numpages: number };
const pdfParse = _require("pdf-parse") as (buf: Buffer) => Promise<PdfParseResult>;

const SUPABASE_URL = "https://pvppwmkswnluidlwnnck.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cHB3bWtzd25sdWlkbHdubmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODg1MjgsImV4cCI6MjA4MDI2NDUyOH0.Sa9fKeEn0jbbvswuyABNHrpb01E4iKfI65_1HgfPWsM";

const router = Router();

const SYSTEM_PROMPT = `You are a bank statement parser. Extract every transaction from the document.

Return ONLY a JSON array (no markdown, no explanation) where each item has:
- "title": merchant name or brief transaction description (string)
- "amount": absolute value as a positive number (number)
- "transaction_type": "debit" (money out / withdrawal / purchase) or "credit" (money in / deposit)
- "date_time": ISO 8601 date string "YYYY-MM-DDTHH:mm:ssZ" (infer year from context if missing)
- "description": any reference numbers, memo, or extra notes (string, may be empty)
- "running_balance": running balance after this transaction as a number, or null if not shown

Rules:
- Extract EVERY individual transaction line, not totals or summaries
- Fees, charges, and interest are debits
- Deposits, transfers in, refunds, and credits are credits
- Never return null for title, amount, transaction_type, date_time, or description`;

async function sbFetch(path: string, token: string, method = "GET", body?: unknown) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=minimal" : "",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

router.post("/scan-statement", requireAuth, async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    res.status(500).json({ error: "missing_openrouter_key" });
    return;
  }

  const { importId, fileData, mimeType } = req.body as {
    importId?: number;
    fileData?: string;
    mimeType?: string;
  };

  if (!importId || typeof fileData !== "string" || !mimeType) {
    res.status(400).json({ error: "importId, fileData, and mimeType are required" });
    return;
  }

  const userJwt = req.headers.authorization!.slice(7);
  const authUuid = req.supabaseUserId!;

  // ── 1. Resolve numericId + orgId via Supabase REST ─────────────────────────
  let numericUserId: number | null = null;
  let orgId: number | null = null;
  try {
    const userRes = await sbFetch(`users?auth_id=eq.${authUuid}&select=id&limit=1`, userJwt);
    const [userRow] = (await userRes.json()) as { id: number }[];
    numericUserId = userRow?.id ?? null;

    if (numericUserId) {
      const orgRes = await sbFetch(
        `organizations?owner_id=eq.${numericUserId}&select=id&limit=1`,
        userJwt
      );
      const [orgRow] = (await orgRes.json()) as { id: number }[];
      orgId = orgRow?.id ?? null;
    }
  } catch {
    // proceed without; pending_transactions may lack org_id
  }

  // ── 2. Build message content for GPT-4o ────────────────────────────────────
  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" } };

  const contentParts: ContentPart[] = [];

  if (mimeType.startsWith("image/")) {
    contentParts.push({
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${fileData}`, detail: "high" },
    });
    contentParts.push({ type: "text", text: "Extract all transactions from this bank statement image." });
  } else if (mimeType === "application/pdf") {
    let pdfText = "";
    try {
      const buf = Buffer.from(fileData, "base64");
      const parsed = await pdfParse(buf);
      pdfText = parsed.text?.trim() ?? "";
    } catch (e) {
      await markFailed(importId, userJwt, `PDF parse error: ${String(e)}`);
      res.status(422).json({ error: "pdf_parse_failed", message: String(e) });
      return;
    }
    if (!pdfText) {
      await markFailed(importId, userJwt, "No text extracted from PDF. Try uploading a scanned image.");
      res.status(422).json({ error: "pdf_empty" });
      return;
    }
    contentParts.push({
      type: "text",
      text: `Here is the bank statement text extracted from a PDF:\n\n${pdfText}\n\nExtract all transactions.`,
    });
  } else {
    // Plain text / CSV
    const text = Buffer.from(fileData, "base64").toString("utf-8");
    contentParts.push({
      type: "text",
      text: `Here is the bank statement:\n\n${text}\n\nExtract all transactions.`,
    });
  }

  // ── 3. Call GPT-4o ─────────────────────────────────────────────────────────
  let transactions: {
    title: string;
    amount: number;
    transaction_type: "debit" | "credit";
    date_time: string;
    description: string;
    running_balance: number | null;
  }[] = [];

  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://booksmart.replit.app",
        "X-Title": "BookSmart",
      },
      body: JSON.stringify({
        model: mimeType.startsWith("image/") ? "openai/gpt-4o" : "openai/gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: contentParts },
        ],
        temperature: 0,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      await markFailed(importId, userJwt, `AI error: ${upstream.status}`);
      res.status(502).json({ error: "upstream_error", detail: errText });
      return;
    }

    const json = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    // GPT may return { transactions: [...] } or just [...]
    const parsed = JSON.parse(cleaned);
    transactions = Array.isArray(parsed)
      ? parsed
      : (parsed.transactions ?? parsed.data ?? []);
  } catch (e) {
    await markFailed(importId, userJwt, `Parse error: ${String(e)}`);
    res.status(502).json({ error: "parse_failed", message: String(e) });
    return;
  }

  // ── 4. Insert pending_transactions ─────────────────────────────────────────
  if (transactions.length > 0) {
    const rows = transactions.map((tx) => ({
      import_id: importId,
      ...(numericUserId !== null ? { user_id: numericUserId } : {}),
      ...(orgId !== null ? { org_id: orgId } : {}),
      title: tx.title ?? "Transaction",
      amount: Math.abs(Number(tx.amount) || 0),
      transaction_type: tx.transaction_type === "credit" ? "credit" : "debit",
      date_time: tx.date_time ?? new Date().toISOString(),
      description: tx.description ?? "",
      running_balance: tx.running_balance ?? null,
      is_duplicate: false,
      status: "pending",
    }));

    await sbFetch("pending_transactions", userJwt, "POST", rows);
  }

  // ── 5. Mark import as completed ────────────────────────────────────────────
  await sbFetch(
    `statement_imports?id=eq.${importId}`,
    userJwt,
    "PATCH",
    { status: "completed" }
  );

  res.json({ ok: true, count: transactions.length });
});

async function markFailed(importId: number, jwt: string, message: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/statement_imports?id=eq.${importId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${jwt}`,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "failed", error_message: message }),
    });
  } catch {}
}

export default router;
