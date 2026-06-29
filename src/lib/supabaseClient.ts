import { createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client. Only the public URL + anon/publishable key are used
 * here — the service-role key must NEVER appear in client code or the bundle.
 *
 * These env vars are only required when VITE_DATA_BACKEND=supabase; under the
 * default 'mock' backend the app runs without them.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if ((!url || !anonKey) && import.meta.env.VITE_DATA_BACKEND === "supabase") {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — the supabase backend cannot connect.",
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
