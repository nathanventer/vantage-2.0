export type DataBackend = "mock" | "supabase";

/**
 * Single source of truth for mock vs supabase. Production (Vercel) defaults to
 * supabase so auth + api both hit the live seeded dataset when env is unset.
 */
export function resolveDataBackend(): DataBackend {
  const explicit = import.meta.env.VITE_DATA_BACKEND as string | undefined;
  if (explicit === "mock" || explicit === "supabase") return explicit;
  return import.meta.env.PROD ? "supabase" : "mock";
}

/** Demo switcher on sign-in/sign-up unless explicitly disabled. */
export function isDemoLoginsEnabled(): boolean {
  return import.meta.env.VITE_DEMO_LOGINS !== "off";
}
