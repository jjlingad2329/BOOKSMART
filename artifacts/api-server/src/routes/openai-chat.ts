import { Router } from "express";

const router = Router();

router.post("/openai-chat", async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    res.status(500).json({ error: "missing_openrouter_key" });
    return;
  }

  const payload = req.body;

  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": "https://booksmart.replit.app",
        "X-Title": "BookSmart",
      },
      body: JSON.stringify(payload),
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
