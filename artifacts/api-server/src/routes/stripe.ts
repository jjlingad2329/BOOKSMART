import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth";

const router = Router();

// Maximum allowed one-time payment amount in cents ($9,999.00)
const MAX_AMOUNT_CENTS = 999_900;
// Accepted currencies
const ALLOWED_CURRENCIES = new Set(["usd", "eur", "gbp", "cad", "aud"]);

router.post("/stripe/create-checkout-session", requireAuth, async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || typeof secretKey !== "string" || !secretKey.trim()) {
    res.status(500).json({ error: "missing_stripe_key" });
    return;
  }

  const { priceId, successUrl, cancelUrl } = req.body as {
    priceId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  // Validate required fields
  if (!priceId || typeof priceId !== "string") {
    res.status(400).json({ error: "priceId_required" });
    return;
  }
  if (!successUrl || typeof successUrl !== "string") {
    res.status(400).json({ error: "successUrl_required" });
    return;
  }
  if (!cancelUrl || typeof cancelUrl !== "string") {
    res.status(400).json({ error: "cancelUrl_required" });
    return;
  }

  // Validate priceId format (Stripe price IDs start with "price_")
  if (!priceId.startsWith("price_")) {
    res.status(400).json({ error: "invalid_priceId_format" });
    return;
  }

  // Validate URLs are https (prevent open redirect / SSRF)
  try {
    const su = new URL(successUrl);
    const cu = new URL(cancelUrl);
    if (su.protocol !== "https:" || cu.protocol !== "https:") {
      res.status(400).json({ error: "urls_must_be_https" });
      return;
    }
  } catch {
    res.status(400).json({ error: "invalid_urls" });
    return;
  }

  // Use the authenticated user's ID, not one supplied by the client
  const userId = req.supabaseUserId!;

  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey.trim()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        "metadata[user_id]": userId,
      }).toString(),
    });

    const data = await response.json() as { url?: string; error?: { message: string } };

    if (!response.ok) {
      res.status(response.status).json({ error: data.error?.message ?? "stripe_error" });
      return;
    }

    res.json({ url: data.url });
  } catch (e) {
    res.status(502).json({ error: "upstream_failed", message: String(e) });
  }
});

router.post("/stripe/create-payment-intent", requireAuth, async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || typeof secretKey !== "string" || !secretKey.trim()) {
    res.status(500).json({ error: "missing_stripe_key" });
    return;
  }

  const { amount, currency = "usd", metadata = {} } = req.body as {
    amount?: number;
    currency?: string;
    metadata?: Record<string, string>;
  };

  // Validate amount
  if (amount === undefined || amount === null) {
    res.status(400).json({ error: "amount_required" });
    return;
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "amount_must_be_positive_number" });
    return;
  }
  const amountCents = Math.round(amount);
  if (amountCents > MAX_AMOUNT_CENTS) {
    res.status(400).json({ error: "amount_exceeds_limit", max_cents: MAX_AMOUNT_CENTS });
    return;
  }

  // Validate currency
  const resolvedCurrency = String(currency).toLowerCase();
  if (!ALLOWED_CURRENCIES.has(resolvedCurrency)) {
    res.status(400).json({ error: "currency_not_allowed", allowed: [...ALLOWED_CURRENCIES] });
    return;
  }

  // Validate metadata keys/values (no injection)
  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    res.status(400).json({ error: "metadata_must_be_object" });
    return;
  }

  // Always attach the authenticated user's ID
  const safeMetadata: Record<string, string> = {
    user_id: req.supabaseUserId!,
  };
  for (const [k, v] of Object.entries(metadata)) {
    if (typeof k === "string" && typeof v === "string" && k.length <= 40 && v.length <= 500) {
      safeMetadata[k] = v;
    }
  }

  const metaParams = Object.entries(safeMetadata).reduce<Record<string, string>>(
    (acc, [k, v]) => {
      acc[`metadata[${k}]`] = v;
      return acc;
    },
    {}
  );

  try {
    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey.trim()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(amountCents),
        currency: resolvedCurrency,
        ...metaParams,
      }).toString(),
    });

    const data = await response.json() as { client_secret?: string; error?: { message: string } };

    if (!response.ok) {
      res.status(response.status).json({ error: data.error?.message ?? "stripe_error" });
      return;
    }

    res.json({ clientSecret: data.client_secret });
  } catch (e) {
    res.status(502).json({ error: "upstream_failed", message: String(e) });
  }
});

export default router;
