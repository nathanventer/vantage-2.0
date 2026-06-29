import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

/** Clears the session and returns the user to the sign-in page. */
export function useSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return useCallback(async () => {
    await signOut();
    navigate({ to: "/" });
  }, [signOut, navigate]);
}
