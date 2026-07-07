import { supabase } from "@/lib/supabaseClient";
import { EDGE_LIVE, invokeEdge } from "@/lib/edge";
import { IS_SUPABASE } from "./auth";

/**
 * Notifier seam. Under supabase it writes a row into `notifications` (in-app bell)
 * and, when an email template is supplied and edge functions are live, also sends
 * a templated email via the send-email edge function. The mock logs to console.
 * Components never call supabase or an email SDK directly.
 */
export type EmailTemplate =
  | "registration_submitted"
  | "registration_approved"
  | "registration_rejected"
  | "quote_received"
  | "payment_settled"
  | "shipment_exception";

export interface NotifyInput {
  userId?: string;
  title: string;
  body?: string;
  kind?: "info" | "success" | "warning" | "error";
  /** Optional deep link for the in-app notification. */
  link?: string;
  /** When set (+ recipient email), also dispatch a templated email via edge. */
  email?: { to: string; template: EmailTemplate; data?: Record<string, string> };
}

export interface Notifier {
  notify(input: NotifyInput): Promise<void>;
}

const consoleNotifier: Notifier = {
  async notify(input) {
    console.info(
      `[notify:${input.kind ?? "info"}] ${input.title}${input.body ? ` — ${input.body}` : ""}`,
    );
  },
};

const supabaseNotifier: Notifier = {
  async notify(input) {
    try {
      // notifications.user_id is NOT NULL — without a target user there is
      // nobody to notify in-app, so skip the row rather than fail the insert.
      // NOTE: the live notifications table has no `kind` column — including it
      // made PostgREST reject the whole insert (swallowed by this try/catch),
      // so in-app notifications were silently dropped.
      if (input.userId) {
        await supabase.from("notifications").insert({
          user_id: input.userId,
          title: input.title,
          body: input.body ?? null,
          link: input.link ?? null,
        });
      }
    } catch {
      // Non-fatal: notifications must never block a business write.
    }
    if (EDGE_LIVE && input.email) {
      try {
        await invokeEdge("send-email", input.email);
      } catch {
        // Non-fatal: email delivery must never block a business write.
      }
    }
    await consoleNotifier.notify(input);
  },
};

export const notifier: Notifier = IS_SUPABASE ? supabaseNotifier : consoleNotifier;
