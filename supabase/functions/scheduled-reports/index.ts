// Scheduled Pulse report delivery. Intended to run on a cron schedule; aggregates
// KPIs via RPC and emails subscribers (and stores a snapshot). Invoke manually or
// wire a schedule with `supabase functions deploy scheduled-reports` + a cron.
//
// Deploy:  supabase functions deploy scheduled-reports
// Schedule (SQL): select cron.schedule('pulse-weekly','0 6 * * 1', $$ ... net.http_post ... $$);
// Secrets: RESEND_API_KEY, EMAIL_FROM
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { json } from "../_shared/cors.ts";

Deno.serve(async (_req) => {
  try {
    const db = adminClient();

    // Heavy aggregate via RPC (defined in migrations: pulse_executive_summary).
    const { data: summary } = await db.rpc("pulse_executive_summary");

    // Recipients: active subscribers who opted into scheduled reports.
    const { data: subs } = await db
      .from("rate_subscriptions")
      .select("user_id, profiles(email, full_name)")
      .eq("status", "active");

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("EMAIL_FROM") ?? "Vantage <onboarding@resend.dev>";
    let sent = 0;

    if (apiKey && subs) {
      for (const s of subs as Array<{ profiles: { email?: string; full_name?: string } | null }>) {
        const email = s.profiles?.email;
        if (!email) continue;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: email,
            subject: "Your weekly Vantage Pulse report",
            html: `<div style="font-family:system-ui;background:#070b16;color:#f3f6fb;padding:24px">
                     <h2 style="color:#4a80ff">Weekly Pulse</h2>
                     <pre style="color:#a6b2c8">${JSON.stringify(summary ?? {}, null, 2)}</pre>
                   </div>`,
          }),
        });
        sent++;
      }
    }

    return json({ ok: true, recipients: subs?.length ?? 0, sent });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500);
  }
});
