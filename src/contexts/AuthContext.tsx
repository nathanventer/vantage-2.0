import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { AuthUser, Role } from "@/types";
import { authAdapter, IS_SUPABASE } from "@/adapters/auth";

type Ctx = {
  user: AuthUser | null;
  role: Role;
  loading: boolean;
  isSupabase: boolean;
  /** Set after a fresh sign-in; drives the welcome overlay until dismissed. */
  welcomeUser: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-pull the current user (e.g. after onboarding writes change approval). */
  refresh: () => Promise<void>;
  dismissWelcome: () => void;
  /** Demo-only role override (no-op effect on data under supabase RLS). */
  setRole: (r: Role) => void;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [welcomeUser, setWelcomeUser] = useState<AuthUser | null>(null);
  const [override, setOverride] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const u = await authAdapter.getCurrentUser();
    setUser(u);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Client-only: getSession touches browser storage.
    refresh();
    const unsub = authAdapter.onChange(refresh);
    return unsub;
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const u = await authAdapter.signIn(email, password);
    setOverride(null);
    setUser(u);
    if (u.companyApproved) setWelcomeUser(u);
  }, []);

  const dismissWelcome = useCallback(() => setWelcomeUser(null), []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const u = await authAdapter.signUp(email, password, fullName);
    setOverride(null);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await authAdapter.signOut();
    setUser(null);
    setOverride(null);
    setWelcomeUser(null);
  }, []);

  const role: Role = override ?? user?.role ?? "demand";

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isSupabase: IS_SUPABASE,
        welcomeUser,
        signIn,
        signUp,
        signOut,
        refresh,
        dismissWelcome,
        setRole: setOverride,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
