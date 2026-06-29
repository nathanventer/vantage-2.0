import type { DataService } from "./DataService";
import { mockApi } from "./mockApi";
import { supabaseApi } from "./supabaseApi";

/**
 * Backend switch. The whole UI imports { api } from "@/services" and never
 * touches mockApi/supabaseApi (or the supabase SDK) directly.
 *
 * VITE_DATA_BACKEND = 'mock' (default) | 'supabase'.
 */
const backend = (import.meta.env.VITE_DATA_BACKEND as string | undefined) ?? "mock";

export const api: DataService = backend === "supabase" ? supabaseApi : mockApi;
export type { DataService };
