import { Router } from "express";

const router = Router();

router.post("/stripe/create-checkout-session", async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || typeof secretKey !== "string" || !secretKey.trim()) {
    res.status(500).json({ error: "missing_stripe_key" });
    return;
  }

  const { priceId, userId, successUrl, cancelUrl } = req.body as {
    priceId: string;
    userId: string;
    successUrl: string;
    cancelUrl: string;
  };

  if (!priceId || !successUrl || !cancelUrl) {
    res.status(400).json({ error: "missing_required_fields" });
    return;
  }

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
        ...(userId ? { "metadata[user_id]": userId } : {}),
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

router.post("/stripe/create-payment-intent", async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || typeof secretKey !== "string" || !secretKey.trim()) {
    res.status(500).json({ error: "missing_stripe_key" });
    return;
  }

  const { amount, currency = "usd", metadata = {} } = req.body as {
    amount: number;
    currency?: string;
    metadata?: Record<string, string>;
  };

  if (!amount || typeof amount !== "number") {
    res.status(400).json({ error: "amount_required" });
    return;
  }

  try {
    const metaParams = Object.entries(metadata).reduce<Record<string, string>>((acc, [k, v]) => {
      acc[`metadata[${k}]`] = v;
      return acc;
    }, {});

    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey.trim()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(Math.round(amount)),
        currency,
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
