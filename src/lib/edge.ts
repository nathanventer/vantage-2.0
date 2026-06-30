import { supabase } from "@/lib/supabaseClient";

/**
 * Edge-function invoker. Real adapter implementations call Supabase Edge
 * Functions through this helper so provider secrets (Stripe, Resend, maps,
 * compliance APIs) never enter the client bundle.
 *
 * `EDGE_LIVE` gates whether the real edge-backed adapter impls are active.
 * It stays OFF by default so the app runs on mock/sandbox until the functions
 * are deployed; flip VITE_EDGE_LIVE=on once `supabase functions deploy` is done.
 */
export const EDGE_LIVE = import.meta.env.VITE_EDGE_LIVE === "on";

export async function invokeEdge<T>(name: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body: body ?? {} });
  if (error) throw new Error(`[edge:${name}] ${error.message}`);
  if (data && typeof data === "object" && "error" in data && (data as { error: unknown }).error) {
    throw new Error(`[edge:${name}] ${JSON.stringify((data as { error: unknown }).error)}`);
  }
  return data as T;
}
