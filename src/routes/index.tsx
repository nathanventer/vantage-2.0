import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Ship,
  ShieldCheck,
  Activity,
  Globe2,
  Briefcase,
  Truck,
  ScanLine,
  Eye,
  EyeOff,
} from "lucide-react";
import { VantageLogo } from "@/components/VantageLogo";
import { useAuth } from "@/contexts/AuthContext";
import { DEMO_LOGINS } from "@/adapters/auth";
import { api } from "@/services";
import { toast } from "sonner";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vantage — Sign in" },
      {
        name: "description",
        content:
          "Sign in to Vantage, the integrated trade and logistics platform for Southern Africa.",
      },
    ],
  }),
  component: Landing,
});

const ROLE_CARDS: { role: Role; icon: typeof Briefcase; title: string }[] = [
  { role: "demand", icon: Briefcase, title: "Demand" },
  { role: "source", icon: Truck, title: "Source" },
  { role: "admin", icon: ScanLine, title: "Admin" },
];

const POLICY_VERSION = "v1.0";

function Landing() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  // Already signed in → approved users go to the app, others resume onboarding.
  useEffect(() => {
    if (!user) return;
    navigate({ to: user.companyApproved ? "/dashboard" : "/register" });
  }, [user, navigate]);

  async function doSignIn(e: string, p: string) {
    setBusy(true);
    try {
      await signIn(e, p);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function doSignUp() {
    if (!consent) return toast.error("Please accept the POPIA privacy policy to continue.");
    setBusy(true);
    try {
      await signUp(email, password, fullName);
      try {
        await api.capturePopiaConsent(POLICY_VERSION);
      } catch {
        /* non-fatal */
      }
      navigate({ to: "/register" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  const enterAs = (r: Role) => {
    const creds = DEMO_LOGINS[r];
    setEmail(creds.email);
    void doSignIn(creds.email, creds.password);
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{
          background:
            "radial-gradient(120% 120% at 0% 0%, var(--grad-from) 0%, var(--grad-to) 55%, var(--bg-app) 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 30%, rgba(255,255,255,.25), transparent 40%), radial-gradient(circle at 15% 85%, rgba(255,255,255,.15), transparent 45%)",
          }}
        />
        <div className="relative">
          <VantageLogo size="lg" tone="light" />
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight">
            One ecosystem. <span className="text-white/80">Vessel to delivery.</span>
          </h1>
          <p className="mt-5 text-white/80">
            Vantage connects importers, exporters, freight forwarders, customs and banks across a
            single end-to-end logistics flow for Southern Africa.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { icon: Ship, label: "Port → Delivery tracking" },
              { icon: ShieldCheck, label: "SARS-aligned compliance" },
              { icon: Activity, label: "Live operations telemetry" },
              { icon: Globe2, label: "Southern Africa network" },
            ].map(({ icon: I, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-white/85">
                <I aria-hidden className="h-4 w-4 text-white" /> {label}
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-sm text-white/70">
          Insight · Intelligence · Opportunity · Growth
        </div>
      </div>

      {/* Auth card */}
      <div className="flex items-center justify-center bg-app p-6 sm:p-10">
        <div className="glass w-full max-w-md rounded-2xl border p-6 shadow-lg sheen sm:p-8">
          <div className="mb-8 flex justify-center lg:hidden">
            <VantageLogo size="md" />
          </div>

          {/* Segmented control */}
          <div className="mb-6 inline-flex w-full rounded-full border bg-inset p-0.5 text-sm">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 font-medium transition",
                  mode === m
                    ? "bg-surface-2 text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
                )}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {mode === "signin" ? (
            <>
              <h2 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h2>
              <p className="mt-1 text-sm text-muted-foreground">Continue to your workspace.</p>
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void doSignIn(email, password);
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.co.za"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <PasswordField
                  id="password"
                  value={password}
                  onChange={setPassword}
                  show={showPw}
                  onToggle={() => setShowPw((s) => !s)}
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in to Vantage"}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> Demo — sign in as{" "}
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_CARDS.map(({ role, icon: I, title }) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => enterAs(role)}
                    disabled={busy}
                    className="group flex flex-col items-center gap-1.5 rounded-xl border bg-surface p-3 text-center transition hover:border-brand hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <I className="h-4 w-4 text-brand" />
                    <span className="text-xs font-semibold">{title}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Create your account
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Register your company in 8 guided steps.
              </p>
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void doSignUp();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Pretorius"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Work email</Label>
                  <Input
                    id="su-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.co.za"
                    required
                  />
                </div>
                <PasswordField
                  id="su-password"
                  value={password}
                  onChange={setPassword}
                  show={showPw}
                  onToggle={() => setShowPw((s) => !s)}
                />
                <label className="flex items-start gap-2.5 rounded-lg border bg-inset p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span className="text-muted-foreground">
                    I consent to the processing of my personal information per the{" "}
                    <a href="#" className="text-brand underline-offset-2 hover:underline">
                      POPIA privacy policy
                    </a>{" "}
                    ({POLICY_VERSION}).
                  </span>
                </label>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating…" : "Create account"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  value,
  onChange,
  show,
  onToggle,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Password</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
