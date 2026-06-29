import { supabase } from "@/lib/supabaseClient";
import type { AuthUser, Role } from "@/types";

/**
 * AuthAdapter seam. The UI talks to `authAdapter` only (never the supabase auth
 * SDK directly). A real Supabase implementation and a frictionless mock are
 * switched by VITE_DATA_BACKEND, mirroring the data `api` switch.
 */
export interface AuthAdapter {
  getCurrentUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  onChange(cb: () => void): () => void;
}

function mapDbRole(r: string): Role {
  if (r === "source_user") return "source";
  if (r === "demand_user" || r === "subscriber") return "demand";
  return "admin"; // super_admin / operations_admin / finance_admin / compliance_admin
}

async function loadProfile(userId: string, fallbackEmail: string): Promise<AuthUser> {
  const { data } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,company_id,company:companies(name)")
    .eq("id", userId)
    .maybeSingle();
  const p = data as {
    email: string | null;
    full_name: string | null;
    role: string;
    company_id: string | null;
    company: { name: string } | null;
  } | null;
  return {
    id: userId,
    email: p?.email ?? fallbackEmail,
    fullName: p?.full_name || p?.email || fallbackEmail,
    role: mapDbRole(p?.role ?? "demand_user"),
    companyId: p?.company_id ?? undefined,
    companyName: p?.company?.name ?? undefined,
  };
}

const supabaseAuth: AuthAdapter = {
  async getCurrentUser() {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return null;
    return loadProfile(session.user.id, session.user.email ?? "");
  },
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return loadProfile(data.user.id, data.user.email ?? email);
  },
  async signOut() {
    await supabase.auth.signOut();
  },
  onChange(cb) {
    const { data } = supabase.auth.onAuthStateChange(() => cb());
    return () => data.subscription.unsubscribe();
  },
};

/* ── Mock auth: keeps the offline demo usable without a real session ──────── */
const DEMO_PROFILE: Record<Role, AuthUser> = {
  demand: {
    id: "demo-demand",
    email: "buyer@ubuntuimports.com",
    fullName: "Michael Dlamini",
    role: "demand",
    companyName: "Ubuntu Retail Imports (Pty) Ltd",
  },
  source: {
    id: "demo-source",
    email: "provider@sclogistics.com",
    fullName: "Sarah Naidoo",
    role: "source",
    companyName: "Southern Cross Logistics Solutions",
  },
  admin: {
    id: "demo-admin",
    email: "admin@tradehub.com",
    fullName: "Platform Admin",
    role: "admin",
  },
};
function roleFromEmail(email: string): Role {
  if (/provider|warehouse|transport|customs|source|sclogistics/i.test(email)) return "source";
  if (/admin|auditor|pulse|tradehub/i.test(email)) return "admin";
  return "demand";
}
let mockUser: AuthUser | null = DEMO_PROFILE.demand; // auto session for the demo
const mockListeners = new Set<() => void>();
const mockAuth: AuthAdapter = {
  async getCurrentUser() {
    return mockUser;
  },
  async signIn(email) {
    mockUser = { ...DEMO_PROFILE[roleFromEmail(email)], email };
    mockListeners.forEach((f) => f());
    return mockUser;
  },
  async signOut() {
    mockUser = null;
    mockListeners.forEach((f) => f());
  },
  onChange(cb) {
    mockListeners.add(cb);
    return () => mockListeners.delete(cb);
  },
};

export const AUTH_BACKEND = (import.meta.env.VITE_DATA_BACKEND as string | undefined) ?? "mock";
export const IS_SUPABASE = AUTH_BACKEND === "supabase";
export const authAdapter: AuthAdapter = IS_SUPABASE ? supabaseAuth : mockAuth;

/** Quick-login credentials for the demo role buttons on the sign-in page. */
export const DEMO_LOGINS: Record<Role, { email: string; password: string }> = {
  demand: { email: "buyer@ubuntuimports.com", password: "Demo@123" },
  source: { email: "provider@sclogistics.com", password: "Demo@123" },
  admin: { email: "admin@tradehub.com", password: "Demo@123" },
};
