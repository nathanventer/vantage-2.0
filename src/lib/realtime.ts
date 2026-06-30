import { supabase } from "@/lib/supabaseClient";
import { IS_SUPABASE } from "@/adapters/auth";

type ChangeHandler = () => void;

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

  const channel = supabase
    .channel(`rt:${table}:${filter ?? "all"}`)
    .on("postgres_changes", { event: "*", schema: "public", table, filter }, () => onChange())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
