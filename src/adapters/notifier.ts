import { supabase } from "@/lib/supabaseClient";
import { EDGE_LIVE, invokeEdge } from "@/lib/edge";
import { IS_SUPABASE } from "./auth";
import { pushMockNotification } from "@/lib/notificationStore";
import type { Json } from "@/types/supabase";
import type { NotificationType } from "@/types";

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
  type?: NotificationType;
  /** Optional deep link for the in-app notification. */
  link?: string;
  /** Deep-link context (shipmentId, quoteId, etc.). */
  metadata?: Record<string, unknown>;
  /** Idempotency key — duplicate deliveries are ignored. */
  dedupKey?: string;
  /** Mock-only: sender display name for the in-app row. */
  senderName?: string;
  senderId?: string;
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
      if (input.userId) {
        await supabase.rpc("deliver_notification", {
          p_recipient_id: input.userId,
          p_title: input.title,
          p_body: input.body ?? null,
          p_type: input.type ?? "status_update",
          p_kind: input.kind ?? "info",
          p_link: input.link ?? null,
          p_metadata: (input.metadata ?? {}) as Json,
          p_dedup_key: input.dedupKey ?? null,
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

const mockNotifier: Notifier = {
  async notify(input) {
    if (input.userId) {
      pushMockNotification(input.userId, {
        title: input.title,
        body: input.body,
        kind: input.kind ?? "info",
        type: input.type ?? "status_update",
        link: input.link,
        senderId: input.senderId,
        senderName: input.senderName,
        metadata: input.metadata,
        id: input.dedupKey,
      });
    }
    await consoleNotifier.notify(input);
  },
};

export const notifier: Notifier = IS_SUPABASE ? supabaseNotifier : mockNotifier;
