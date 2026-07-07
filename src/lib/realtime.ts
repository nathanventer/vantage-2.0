import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { IS_SUPABASE } from "@/adapters/auth";

type ChangeHandler = () => void;

type ChannelEntry = {
  channel: RealtimeChannel;
  handlers: Set<ChangeHandler>;
};

/** One Supabase channel per table+filter; multiple UI subscribers share it. */
const channels = new Map<string, ChannelEntry>();

/**
 * Subscribe to Postgres changes on a table via Supabase Realtime (RLS-filtered).
 * Under the mock backend this is a no-op (returns a no-op unsubscribe), so UI can
 * call it unconditionally. Components never touch the supabase client directly.
 */
export function subscribeTable(
  table: string,
  onChange: ChangeHandler,
  filter?: string,
): () => void {
  if (!IS_SUPABASE) return () => {};

  const key = `rt:${table}:${filter ?? "all"}`;
  let entry = channels.get(key);

  if (!entry) {
    const handlers = new Set<ChangeHandler>();
    const channel = supabase
      .channel(key)
      .on("postgres_changes", { event: "*", schema: "public", table, filter }, () => {
        handlers.forEach((handler) => handler());
      })
      .subscribe();
    entry = { channel, handlers };
    channels.set(key, entry);
  }

  entry.handlers.add(onChange);

  return () => {
    const current = channels.get(key);
    if (!current) return;
    current.handlers.delete(onChange);
    if (current.handlers.size === 0) {
      void supabase.removeChannel(current.channel);
      channels.delete(key);
    }
  };
}
