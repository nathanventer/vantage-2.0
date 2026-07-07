import { useAuth } from "@/contexts/AuthContext";

/** True when Supabase session is restored (or mock backend — always ready). */
export function useAuthReady(): boolean {
  const { user, loading, isSupabase } = useAuth();
  return !isSupabase || (!loading && !!user);
}
