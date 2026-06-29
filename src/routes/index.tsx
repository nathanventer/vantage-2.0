import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ship, ShieldCheck, Activity, Globe2, ArrowRight, Briefcase, Truck, ScanLine } from "lucide-react";
import logoAsset from "@/assets/vantage-logo.png.asset.json";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DEMO_LOGINS } from "@/adapters/auth";
import { toast } from "sonner";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vantage — Sign in" },
      { name: "description", content: "Sign in to Vantage, the integrated trade and logistics platform for Southern Africa." },
    ],
  }),
  component: Landing,
});

const ROLE_CARDS: { role: Role; icon: typeof Briefcase; title: string; desc: string }[] = [
  { role: "demand", icon: Briefcase, title: "Demand", desc: "Importer, exporter, manufacturer or trader requesting logistics." },
  { role: "source", icon: Truck,     title: "Source",  desc: "Forwarder, clearing agent, warehouse or transport operator." },
  { role: "admin",  icon: ScanLine,  title: "Admin",   desc: "Compliance and governance review of registrations and audit." },
];

function Landing() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  const doSignIn = async (e: string, p: string) => {
    setBusy(true);
    try {
      await signIn(e, p);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const enterAs = (r: Role) => {
    const creds = DEMO_LOGINS[r];
    setEmail(creds.email);
    void doSignIn(creds.email, creds.password);
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div aria-hidden className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(27,154,170,0.45), transparent 45%), radial-gradient(circle at 80% 75%, rgba(45,108,223,0.35), transparent 50%)" }} />
        <div className="relative flex items-center gap-3">
          <img src={logoAsset.url} alt="Vantage" className="h-12 w-12 rounded-lg bg-white p-1" />
          <div>
            <div className="font-display text-2xl font-bold tracking-tight">VANTAGE</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-primary-foreground/70">Trade & Logistics Platform</div>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight">
            One ecosystem. <span className="text-accent">Vessel to delivery.</span>
          </h1>
          <p className="mt-5 text-primary-foreground/80">
            Vantage connects importers, exporters, freight forwarders, customs and banks across a single end-to-end logistics flow for Southern Africa.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { icon: Ship, label: "Port → Delivery tracking" },
              { icon: ShieldCheck, label: "SARS-aligned compliance" },
              { icon: Activity, label: "Live operations telemetry" },
              { icon: Globe2, label: "Southern Africa network" },
            ].map(({ icon: I, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <I aria-hidden className="h-4 w-4 text-accent" /> {label}
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-sm text-primary-foreground/80">Insight · Intelligence · Opportunity · Growth</div>
      </div>

      {/* Auth + role selection */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <img src={logoAsset.url} alt="Vantage" className="h-10 w-10 rounded-md border bg-white p-1" />
            <div className="flex flex-col leading-tight">
              <span className="font-display text-xl font-bold text-primary">VANTAGE</span>
              <span className="text-[11px] text-primary/80">Insight · Intelligence · Opportunity · Growth</span>
            </div>
          </div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-primary">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back. Continue to your workspace.</p>
          <p className="mt-1 hidden text-xs text-primary/70 lg:block">Insight · Intelligence · Opportunity · Growth</p>


          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => { e.preventDefault(); void doSignIn(email, password); }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" placeholder="you@company.co.za" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in to Vantage"}</Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> Demo — explore as <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-2">
            {ROLE_CARDS.map(({ role, icon: I, title, desc }) => (
              <button
                key={role}
                onClick={() => enterAs(role)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition",
                  "hover:border-accent hover:shadow-sm",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <I className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="truncate text-xs text-muted-foreground">{desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-accent" />
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-xl border bg-card p-4 text-sm">
            <div className="font-medium">New to Vantage?</div>
            <p className="mt-1 text-muted-foreground">Complete the 8-step onboarding to register your company.</p>
            <Button asChild variant="outline" className="mt-3 w-full">
              <Link to="/register">Start registration</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
