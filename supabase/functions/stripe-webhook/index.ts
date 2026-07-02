// Stripe webhook — the ONLY place an invoice is marked settled or a subscription
// is activated. Verifies the Stripe signature, then writes via service role.
// Client-reported settlement is never trusted.
//
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
import Stripe from "npm:stripe@^16";
import { adminClient } from "../_shared/supabaseAdmin.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig!, webhookSecret);
  } catch (e) {
    return new Response(`signature verification failed: ${e instanceof Error ? e.message : e}`, {
      status: 400,
    });
  }

  const db = adminClient();
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const invoiceId = pi.metadata.invoice_id;
        await db
          .from("payments")
          .update({ gateway_status: "Verified", settled_at: new Date().toISOString() })
          .eq("gateway_ref", pi.id);
        if (invoiceId) {
          await db.from("invoices").update({ status: "Paid" }).eq("id", invoiceId);
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan ?? "standard";
        if (userId) {
          await db.from("rate_subscriptions").upsert(
            {
              user_id: userId,
              plan,
              status: "active",
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              current_period_end: null,
            },
            { onConflict: "user_id" },
          );
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .from("rate_subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id);
        break;
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(`handler error: ${e instanceof Error ? e.message : e}`, { status: 500 });
  }
});
