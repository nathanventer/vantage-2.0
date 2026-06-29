import { useAuth } from "@/contexts/AuthContext";

/**
 * Backwards-compatible role hook. Role now derives from the authenticated user
 * (see AuthContext); `setRole` is a demo-only override used by the role switcher
 * under the mock backend.
 */
export function useRole() {
  const { role, setRole } = useAuth();
  return { role, setRole };
}
