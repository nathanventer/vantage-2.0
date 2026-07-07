import type { DataService } from "./DataService";
import { mockApi } from "./mockApi";
import { supabaseApi } from "./supabaseApi";
import { resolveDataBackend } from "@/lib/dataBackend";

/**
 * Backend switch. The whole UI imports { api } from "@/services" and never
 * touches mockApi/supabaseApi (or the supabase SDK) directly.
 *
 * VITE_DATA_BACKEND = 'mock' | 'supabase'. When unset, defaults to 'mock' so
 * the public demo (localhost + Vercel) matches the full offline dataset.
 */
const backend = resolveDataBackend();

export const api: DataService = backend === "supabase" ? supabaseApi : mockApi;
export type { DataService };
