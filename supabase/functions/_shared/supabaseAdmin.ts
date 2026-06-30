// Service-role Supabase client for edge functions. NEVER ship the service-role
// key to the browser — it lives only in edge-function env.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in function env");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/** Resolve the calling user from the forwarded Authorization bearer token. */
export async function callerFromAuthHeader(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const token = auth.replace("Bearer ", "");
  const { data } = await adminClient().auth.getUser(token);
  return data.user?.id ?? null;
}
