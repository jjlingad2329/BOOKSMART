// supabase/functions/create-subscription/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {

  // --------------------------------
  // CORS
  // --------------------------------
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {

    // --------------------------------
    // Test Mode — query param only
    // --------------------------------
    const url = new URL(req.url);
    const testMode = url.searchParams.get("test") === "true";

    // --------------------------------
    // Auth — verify Supabase JWT
    // --------------------------------
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return Response.json(
        { error: "Missing authorization header" },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    // --------------------------------
    // Parse Request Body
    // --------------------------------
    const { price_id } = await req.json();

    if (!price_id) {
      return Response.json(
        { error: "Missing price_id" },
        { status: 400, headers: corsHeaders }
      );
    }

    // --------------------------------
    // Stripe Client
    // --------------------------------
    const stripeKey = testMode
      ? Deno.env.get("STRIPE_DEV_SECRET_KEY")!
      : Deno.env.get("STRIPE_PROD_SECRET_KEY")!;

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // --------------------------------
    // Fetch User's Stripe Customer ID
    // --------------------------------
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, stripe_customer_id, email")
      .eq("auth_id", user.id)
      .single();

    if (userError || !userData) {
      return Response.json(
        { error: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    let customerId = userData.stripe_customer_id;

    // Create Stripe customer if doesn't exist yet
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: { supabase_user_id: user.id },
      });

      customerId = customer.id;

      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("auth_id", user.id);
    }

    // --------------------------------
    // Resolve Default Payment Method
    // --------------------------------
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

    let paymentMethodId: string | null =
      (customer.invoice_settings?.default_payment_method as string) ?? null;

    // Fallback to first attached card if no default
    if (!paymentMethodId) {
      const methods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });

      if (methods.data.length === 0) {
        return Response.json(
          { error: "No payment method found. Please add a card first." },
          { status: 400, headers: corsHeaders }
        );
      }

      paymentMethodId = methods.data[0].id;
    }

    // --------------------------------
    // Check No Existing Active Subscription
    // --------------------------------
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userData.id)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    if (existingSub) {
      return Response.json(
        { error: "User already has an active subscription" },
        { status: 409, headers: corsHeaders }
      );
    }

    // --------------------------------
    // Create Subscription
    // --------------------------------
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price_id }],
      default_payment_method: paymentMethodId,
      payment_behavior: "error_if_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    console.log("Subscription created:", subscription.id, "status:", subscription.status);

    return Response.json(
      { status: subscription.status, subscription_id: subscription.id },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("create-subscription error:", error);

    return Response.json(
      { error: "Subscription creation failed" },
      { status: 500, headers: corsHeaders }
    );
  }
});