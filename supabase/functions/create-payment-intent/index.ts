// Creates a Stripe PaymentIntent for an invoice settlement. The client never
// sees the secret key and never marks an invoice paid — that happens only in the
// stripe-webhook function after Stripe confirms the charge.
//
// Deploy:  supabase functions deploy create-payment-intent
// Secrets: STRIPE_SECRET_KEY
import Stripe from "npm:stripe@^16";
import { adminClient, callerFromAuthHeader } from "../_shared/supabaseAdmin.ts";
import { json, preflight } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const userId = await callerFromAuthHeader(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const { invoiceNumber, amountZAR, method } = await req.json();
    if (!invoiceNumber || !amountZAR)
      return json({ error: "invoiceNumber and amountZAR required" }, 400);

    const db = adminClient();
    // Resolve the invoice via service role (re-validate the amount server-side).
    const { data: invoice, error } = await db
      .from("invoices")
      .select("id, number, amount_cents, client_company_id")
      .eq("number", invoiceNumber)
      .single();
    if (error || !invoice) return json({ error: "invoice not found" }, 404);

    // SANDBOX: no Stripe key configured — record a pending EFT-style initiation
    // so the settlement flow is exercisable end-to-end. Settlement still only
    // happens server-side (manual verify / webhook), never from the client.
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      const reference = `SBX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      await db.from("payments").insert({
        invoice_id: invoice.id,
        invoice_number: invoice.number,
        amount_cents: invoice.amount_cents,
        method: method ?? "EFT",
        gateway_status: "Pending",
        gateway_ref: reference,
      });
      return json({ clientSecret: null, reference });
    }

    const intent = await stripe.paymentIntents.create({
      amount: Number(invoice.amount_cents),
      currency: "zar",
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.number,
        method: method ?? "Card",
        user_id: userId,
      },
      automatic_payment_methods: { enabled: true },
    });

    // Record the initiation (NOT settlement) for the timeline + audit.
    await db.from("payments").insert({
      invoice_id: invoice.id,
      invoice_number: invoice.number,
      amount_cents: invoice.amount_cents,
      method: method ?? "Card",
      gateway_status: "Pending",
      gateway_ref: intent.id,
    });

    return json({ clientSecret: intent.client_secret, reference: intent.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500);
  }
});
