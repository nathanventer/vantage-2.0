import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, isSupabase } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSupabase && !loading && !user) navigate({ to: "/" });
  }, [isSupabase, loading, user, navigate]);

  if (isSupabase && loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }
  if (isSupabase && !user) return null;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
