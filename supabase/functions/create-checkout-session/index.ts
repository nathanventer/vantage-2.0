// Creates a Stripe Checkout Session for a Pulse (Rate Intelligence) subscription.
// Entitlement is granted only by the stripe-webhook on checkout.session.completed.
//
// Deploy:  supabase functions deploy create-checkout-session
// Secrets: STRIPE_SECRET_KEY, PULSE_PRICE_STANDARD, PULSE_PRICE_PRO, APP_URL
import Stripe from "npm:stripe@^16";
import { adminClient, callerFromAuthHeader } from "../_shared/supabaseAdmin.ts";
import { json, preflight } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const PRICES: Record<string, string | undefined> = {
  standard: Deno.env.get("PULSE_PRICE_STANDARD"),
  pro: Deno.env.get("PULSE_PRICE_PRO"),
};

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const userId = await callerFromAuthHeader(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const { plan = "standard", email } = await req.json();
    if (plan !== "standard" && plan !== "pro") {
      return json({ error: `unknown plan: ${plan}` }, 400);
    }

    const price = PRICES[plan];
    // Demo / sandbox: grant entitlement locally when Stripe price IDs are not configured.
    if (!price || !Deno.env.get("STRIPE_SECRET_KEY")) {
      const db = adminClient();
      const periodEnd = new Date(Date.now() + 30 * 864e5).toISOString();
      const { error } = await db.from("rate_subscriptions").upsert(
        {
          user_id: userId,
          plan,
          status: "active",
          current_period_end: periodEnd,
        },
        { onConflict: "user_id" },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ url: null });
    }

    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:8092";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: email,
      success_url: `${appUrl}/pulse?checkout=success`,
      cancel_url: `${appUrl}/pulse?checkout=cancel`,
      metadata: { user_id: userId, plan },
      subscription_data: { metadata: { user_id: userId, plan } },
    });

    return json({ url: session.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500);
  }
});
