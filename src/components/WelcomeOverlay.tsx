import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { VantageLogo } from "@/components/VantageLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AuthUser, Role } from "@/types";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<Role, string> = {
  demand: "Demand",
  source: "Source",
  admin: "Admin",
};

const ROLE_STYLE: Record<Role, string> = {
  demand: "bg-info/15 text-info border-info/25",
  source: "bg-ok/15 text-ok border-ok/25",
  admin: "bg-[#6e5bf2]/15 text-[#a89bf8] border-[#6e5bf2]/25",
};

const ROLE_TAGLINE: Record<Role, string> = {
  demand: "Your import workspace is ready.",
  source: "Your logistics console is ready.",
  admin: "Platform control is unlocked.",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function WelcomeBurst() {
  const dots = Array.from({ length: 20 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {dots.map((i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-brand opacity-80"
          style={{
            animation: `welcome-confetti ${0.85 + (i % 5) * 0.1}s ease-out forwards`,
            animationDelay: `${(i % 8) * 45}ms`,
            ["--burst-x" as string]: `${Math.cos((i / 20) * Math.PI * 2) * (50 + (i % 4) * 24)}px`,
            ["--burst-y" as string]: `${Math.sin((i / 20) * Math.PI * 2) * (50 + (i % 3) * 28)}px`,
          }}
        />
      ))}
    </div>
  );
}

type WelcomeOverlayProps = {
  user: AuthUser;
  onDismiss: () => void;
};

export function WelcomeOverlay({ user, onDismiss }: WelcomeOverlayProps) {
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const firstName = user.fullName.split(/\s+/)[0] ?? user.fullName;

  const dismiss = useCallback(() => {
    setPhase((current) => (current === "exit" ? current : "exit"));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(dismiss, 2800);
    return () => window.clearTimeout(timer);
  }, [dismiss]);

  useEffect(() => {
    if (phase !== "exit") return;
    const timer = window.setTimeout(onDismiss, 480);
    return () => window.clearTimeout(timer);
  }, [phase, onDismiss]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss]);

  return (
    <div
      className={cn(
        "welcome-overlay fixed inset-0 z-[100] flex items-center justify-center p-6",
        phase === "enter" ? "welcome-overlay-enter" : "welcome-overlay-exit",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      aria-describedby="welcome-desc"
      onClick={dismiss}
    >
      <div
        className="welcome-overlay-backdrop absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, var(--grad-from) 0%, var(--grad-to) 45%, rgba(7,11,22,.94) 100%)",
        }}
      />

      <div
        className={cn(
          "welcome-card glass relative z-10 w-full max-w-md overflow-hidden rounded-2xl border p-8 text-center shadow-2xl sheen",
          phase === "enter" ? "welcome-card-enter" : "welcome-card-exit",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <WelcomeBurst />

        <div className="relative z-10 flex flex-col items-center">
          <VantageLogo size="md" tone="light" className="welcome-logo mb-6" />

          <div className="relative mb-5">
            <span className="welcome-ring absolute inset-0 rounded-full bg-brand/25" aria-hidden />
            <Avatar className="welcome-avatar relative h-20 w-20 border-2 border-brand/40 shadow-lg">
              <AvatarFallback className="bg-brand text-lg font-semibold text-white">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Signed in</p>
          <h1
            id="welcome-title"
            className="welcome-title mt-2 font-display text-3xl font-bold tracking-tight"
          >
            Welcome back, {firstName}
          </h1>
          <p id="welcome-desc" className="welcome-desc mt-2 text-sm text-muted-foreground">
            {ROLE_TAGLINE[user.role]}
          </p>

          <div className="welcome-meta mt-5 flex flex-wrap items-center justify-center gap-2">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                ROLE_STYLE[user.role],
              )}
            >
              {ROLE_LABEL[user.role]}
            </span>
            {user.companyName && (
              <span className="max-w-[14rem] truncate rounded-full border bg-inset px-3 py-1 text-xs text-muted-foreground">
                {user.companyName}
              </span>
            )}
          </div>

          <div className="welcome-cta mt-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft/40 px-4 py-2 text-sm font-medium text-brand">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            Entering your workspace…
          </div>
        </div>
      </div>
    </div>
  );
}
