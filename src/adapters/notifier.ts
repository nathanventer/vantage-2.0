import { supabase } from "@/lib/supabaseClient";
import { IS_SUPABASE } from "./auth";

/**
 * Notifier seam. Under supabase it writes a row into `notifications`; the mock
 * logs to the console. Components never call supabase directly for this.
 */
export interface NotifyInput {
  userId?: string;
  title: string;
  body?: string;
  kind?: "info" | "success" | "warning" | "error";
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
      await supabase.from("notifications").insert({
        user_id: input.userId ?? null,
        title: input.title,
        body: input.body ?? null,
        kind: input.kind ?? "info",
      });
    } catch {
      // Non-fatal: notifications must never block a business write.
    }
    await consoleNotifier.notify(input);
  },
};

export const notifier: Notifier = IS_SUPABASE ? supabaseNotifier : consoleNotifier;
