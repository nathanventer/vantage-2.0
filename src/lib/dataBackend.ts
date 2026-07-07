export type DataBackend = "mock" | "supabase";

/**
 * Single source of truth for mock vs supabase. Defaults to mock so the public
 * demo (localhost + Vercel) serves the full TradeHub dataset. Set
 * VITE_DATA_BACKEND=supabase for live Supabase integration testing.
 */
export function resolveDataBackend(): DataBackend {
  const explicit = import.meta.env.VITE_DATA_BACKEND as string | undefined;
  if (explicit === "mock" || explicit === "supabase") return explicit;
  return "mock";
}

/** Demo switcher on sign-in/sign-up unless explicitly disabled. */
export function isDemoLoginsEnabled(): boolean {
  return import.meta.env.VITE_DEMO_LOGINS !== "off";
}
