import type { DataService } from "./DataService";
import { mockApi } from "./mockApi";

/**
 * Backend switch. The whole UI imports { api } from "@/services" and never
 * touches mockApi/supabaseApi (or the supabase SDK) directly.
 *
 * VITE_DATA_BACKEND = 'mock' (default) | 'supabase'. The supabase backend is
 * wired in STEP 4; until then we stay on mock so the app always runs.
 */
const backend = (import.meta.env.VITE_DATA_BACKEND as string | undefined) ?? "mock";

function resolveApi(): DataService {
  if (backend === "supabase") {
    // STEP 4 will replace this with the real supabaseApi implementation.
    console.warn(
      "[services] VITE_DATA_BACKEND=supabase but supabaseApi is not wired yet (STEP 4) — falling back to mock.",
    );
    return mockApi;
  }
  return mockApi;
}

export const api: DataService = resolveApi();
export type { DataService };
