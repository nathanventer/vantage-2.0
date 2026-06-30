// Templated transactional email via Resend. Called by the Notifier port's real
// impl (and other functions). Secrets stay server-side.
//
// Deploy:  supabase functions deploy send-email
// Secrets: RESEND_API_KEY, EMAIL_FROM (e.g. "Vantage <noreply@yourdomain.co.za>")
import { json, preflight } from "../_shared/cors.ts";

type TemplateId =
  | "registration_submitted"
  | "registration_approved"
  | "registration_rejected"
  | "quote_received"
  | "payment_settled"
  | "shipment_exception";

interface EmailRequest {
  to: string;
  template: TemplateId;
  data?: Record<string, string>;
}

function render(template: TemplateId, d: Record<string, string> = {}): { subject: string; html: string } {
  const shell = (title: string, body: string) =>
    `<div style="font-family:system-ui,sans-serif;background:#070b16;color:#f3f6fb;padding:32px">
       <h1 style="color:#4a80ff;margin:0 0 8px">VANTAGE</h1>
       <h2 style="margin:0 0 16px">${title}</h2>
       <div style="color:#a6b2c8;line-height:1.6">${body}</div>
     </div>`;
  switch (template) {
    case "registration_submitted":
      return { subject: "We received your registration", html: shell("Registration received", `Hi ${d.name ?? "there"}, your company registration is under review.`) };
    case "registration_approved":
      return { subject: "Your Vantage account is approved", html: shell("Approved", `Welcome aboard, ${d.name ?? ""}. Your workspace is now unlocked.`) };
    case "registration_rejected":
      return { subject: "Registration update", html: shell("Registration not approved", `Reason: ${d.reason ?? "Please contact support."}`) };
    case "quote_received":
      return { subject: `New quote on ${d.reference ?? "your shipment"}`, html: shell("New quote", `${d.provider ?? "A provider"} quoted ${d.amount ?? ""}.`) };
    case "payment_settled":
      return { subject: `Payment settled — ${d.invoice ?? ""}`, html: shell("Payment settled", `Invoice ${d.invoice ?? ""} for ${d.amount ?? ""} has settled.`) };
    case "shipment_exception":
      return { subject: `Exception on ${d.reference ?? "shipment"}`, html: shell("Shipment exception", `${d.detail ?? "An exception was raised."}`) };
  }
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { to, template, data } = (await req.json()) as EmailRequest;
    if (!to || !template) return json({ error: "to and template required" }, 400);

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("EMAIL_FROM") ?? "Vantage <onboarding@resend.dev>";
    if (!apiKey) return json({ error: "RESEND_API_KEY not configured" }, 503);

    const { subject, html } = render(template, data);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const body = await res.json();
    if (!res.ok) return json({ error: body }, res.status);
    return json({ id: body.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500);
  }
});
