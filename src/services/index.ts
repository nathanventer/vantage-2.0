import type { DataService } from "./DataService";
import { mockApi } from "./mockApi";
import { supabaseApi } from "./supabaseApi";

/**
 * Backend switch. The whole UI imports { api } from "@/services" and never
 * touches mockApi/supabaseApi (or the supabase SDK) directly.
 *
 * VITE_DATA_BACKEND = 'mock' | 'supabase'. When unset, production builds
 * (e.g. Vercel) default to 'supabase' so the live site serves the full seeded
 * dataset; tests/dev default to 'mock' to run offline. Set the env var to
 * override either way.
 */
const backend =
  (import.meta.env.VITE_DATA_BACKEND as string | undefined) ??
  (import.meta.env.PROD ? "supabase" : "mock");

export const api: DataService = backend === "supabase" ? supabaseApi : mockApi;
export type { DataService };
