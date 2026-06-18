import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@18.0.0";

console.info("stripe-plans started");

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  const url = new URL(req.url);
  const testMode = url.searchParams.get("test") === "true";

  const stripeKey = testMode
    ? Deno.env.get("STRIPE_DEV_SECRET_KEY")
    : Deno.env.get("STRIPE_LIVE_SECRET_KEY");

  if (!stripeKey) {
    return Response.json({ error: "Missing Stripe key" }, { status: 500, headers: corsHeaders() });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-05-28.basil" });

  const [products, prices] = await Promise.all([
    stripe.products.list({ active: true, limit: 100 }),
    stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] }),
  ]);

  const plans = products.data.map((product) => {
    const productPrices = prices.data
      .filter((p) => {
        const productId = typeof p.product === "string" ? p.product : p.product.id;
        return productId === product.id;
      })
      .map((price) => ({
        id: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
      }));
    return { id: product.id, name: product.name, prices: productPrices };
  });

  return Response.json({ mode: testMode ? "test" : "live", plans }, { headers: corsHeaders() });
});