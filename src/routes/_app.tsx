import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, isSupabase, welcomeUser, dismissWelcome } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSupabase || loading) return;
    if (!user) navigate({ to: "/" });
    else if (!user.companyApproved) navigate({ to: "/register" }); // gate until approved
  }, [isSupabase, loading, user, navigate]);

  if (isSupabase && loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }
  if (isSupabase && (!user || !user.companyApproved)) return null;

  return (
    <>
      <AppShell>
        <Outlet />
      </AppShell>
      {welcomeUser && <WelcomeOverlay user={welcomeUser} onDismiss={dismissWelcome} />}
    </>
  );
}
