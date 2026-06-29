import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth";

const router = Router();

// Allowlisted models to prevent cost abuse
const ALLOWED_MODELS = new Set([
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "anthropic/claude-3-haiku",
  "anthropic/claude-3.5-sonnet",
]);

const MAX_MESSAGES = 50;
const MAX_TOKENS = 2000;
const MAX_BODY_BYTES = 64 * 1024; // 64 KB

router.post("/openai-chat", requireAuth, async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    res.status(500).json({ error: "missing_openrouter_key" });
    return;
  }

  // Reject oversized payloads (belt-and-suspenders; express.json already limits)
  const rawLength = Number(req.headers["content-length"] ?? 0);
  if (rawLength > MAX_BODY_BYTES) {
    res.status(413).json({ error: "payload_too_large" });
    return;
  }

  const { model, messages, max_tokens, ...rest } = req.body as {
    model?: string;
    messages?: unknown[];
    max_tokens?: number;
    [key: string]: unknown;
  };

  // Model allowlist
  const resolvedModel = model ?? "openai/gpt-4o-mini";
  if (!ALLOWED_MODELS.has(resolvedModel)) {
    res.status(400).json({ error: "model_not_allowed", allowed: [...ALLOWED_MODELS] });
    return;
  }

  // Messages validation
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages_required" });
    return;
  }
  if (messages.length > MAX_MESSAGES) {
    res.status(400).json({ error: "too_many_messages", max: MAX_MESSAGES });
    return;
  }

  // Cap max_tokens
  const resolvedMaxTokens = Math.min(
    typeof max_tokens === "number" && max_tokens > 0 ? max_tokens : MAX_TOKENS,
    MAX_TOKENS
  );

  // Strip unknown top-level keys to prevent forwarding unexpected fields
  const safePayload = {
    model: resolvedModel,
    messages,
    max_tokens: resolvedMaxTokens,
    ...(typeof rest.temperature === "number" ? { temperature: rest.temperature } : {}),
    ...(typeof rest.stream === "boolean" ? { stream: rest.stream } : {}),
  };

  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": "https://booksmart.replit.app",
        "X-Title": "BookSmart",
      },
      body: JSON.stringify(safePayload),
    });

    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") || "application/json";
    res.status(upstream.status);
    res.setHeader("Content-Type", ct);
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: "upstream_failed", message: String(e) });
  }
});

export default router;
