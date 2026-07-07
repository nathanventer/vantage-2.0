import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { resolveDataBackend } from "@/lib/dataBackend";

/**
 * Browser Supabase client. Only the public URL + anon/publishable key are used
 * here — the service-role key must NEVER appear in client code or the bundle.
 */
const DEMO_URL = "https://qzckmlhaoehsngxjlgfk.supabase.co";
/** Publishable (client-safe) key for the Vantage demo project — Vercel fallback. */
const DEMO_ANON_KEY = "sb_publishable_jZIBwaS5WQ600ObVJS-efQ_CSa2yxf_";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEMO_URL;
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEMO_ANON_KEY;

if (
  resolveDataBackend() === "supabase" &&
  (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)
) {
  console.info(
    "[supabase] Using built-in demo project credentials — set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to override.",
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
