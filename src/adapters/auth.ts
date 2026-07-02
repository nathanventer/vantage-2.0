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
  signUp(email: string, password: string, fullName: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  onChange(cb: () => void): () => void;
}

function mapDbRole(r: string): Role {
  if (r === "source_user") return "source";
  if (r === "demand_user" || r === "subscriber") return "demand";
  return "admin"; // super_admin / operations_admin / finance_admin / compliance_admin
}

function authErrorMessage(message: string): string {
  if (/invalid api key/i.test(message)) {
    return "Invalid Supabase API key — check VITE_SUPABASE_ANON_KEY in .env.local and restart the dev server.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "Invalid email or password. Demo accounts use password Demo@123 (capital D, @ symbol).";
  }
  if (/email not confirmed/i.test(message)) {
    return "Email not confirmed. Use a seeded demo account or confirm your email in Supabase Auth.";
  }
  return message;
}

async function loadProfile(userId: string, fallbackEmail: string): Promise<AuthUser> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,email,full_name,role,company_id,onboarding_step,company:companies(name,approval_status)",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(authErrorMessage(error.message));
  const p = data as {
    email: string | null;
    full_name: string | null;
    role: string;
    company_id: string | null;
    onboarding_step: number | null;
    company: { name: string; approval_status: string } | null;
  } | null;
  if (!p) {
    await supabase.auth.signOut();
    throw new Error(
      "Signed in but no profile was found. Re-run supabase/seed.sql or contact your administrator.",
    );
  }
  const role = mapDbRole(p.role ?? "demand_user");
  return {
    id: userId,
    email: p.email ?? fallbackEmail,
    fullName: p.full_name || p.email || fallbackEmail,
    role,
    companyId: p.company_id ?? undefined,
    companyName: p.company?.name ?? undefined,
    // Admins have no trading company but are never gated; everyone else needs approval.
    companyApproved: role === "admin" || p.company?.approval_status === "approved",
    onboardingStep: p.onboarding_step ?? 1,
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
    if (error) throw new Error(authErrorMessage(error.message));
    return loadProfile(data.user.id, data.user.email ?? email);
  },
  async signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Sign up did not return a user");
    return loadProfile(data.user.id, email);
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
    companyApproved: true,
    onboardingStep: 8,
  },
  source: {
    id: "demo-source",
    email: "provider@sclogistics.com",
    fullName: "Sarah Naidoo",
    role: "source",
    companyName: "Southern Cross Logistics Solutions",
    companyApproved: true,
    onboardingStep: 8,
  },
  admin: {
    id: "demo-admin",
    email: "admin@tradehub.com",
    fullName: "Platform Admin",
    role: "admin",
    companyApproved: true,
    onboardingStep: 8,
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
  async signUp(email, _password, fullName) {
    // New mock signups land in the wizard (unapproved) to exercise onboarding.
    mockUser = {
      id: "demo-new",
      email,
      fullName,
      role: "demand",
      companyApproved: false,
      onboardingStep: 1,
    };
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
