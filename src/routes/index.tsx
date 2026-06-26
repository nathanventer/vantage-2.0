import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ship, ShieldCheck, Activity, Globe2 } from "lucide-react";
import logoAsset from "@/assets/vantage-logo.png.asset.json";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vantage — Sign in" },
      { name: "description", content: "Sign in to Vantage, the integrated trade and logistics platform for Southern Africa." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(27,154,170,0.4), transparent 40%), radial-gradient(circle at 80% 70%, rgba(45,108,223,0.3), transparent 45%)" }} />
        <div className="relative flex items-center gap-3">
          <img src={logoAsset.url} alt="Vantage" className="h-12 w-12 rounded-lg bg-white p-1" />
          <div>
            <div className="font-display text-2xl font-bold tracking-tight">VANTAGE</div>
            <div className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">Market Intelligence Platform</div>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            One ecosystem. <span className="text-accent">Vessel to delivery.</span>
          </h1>
          <p className="mt-4 text-primary-foreground/80">
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
                <I className="h-4 w-4 text-accent" /> {label}
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-primary-foreground/60">INSIGHT · INTELLIGENCE · OPPORTUNITY · GROWTH</div>
      </div>

      {/* Auth panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <img src={logoAsset.url} alt="Vantage" className="h-10 w-10 rounded bg-primary p-1" />
            <span className="font-display text-xl font-bold">VANTAGE</span>
          </div>
          <h2 className="font-display text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back. Continue to your workspace.</p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => { e.preventDefault(); navigate({ to: "/dashboard" }); }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" placeholder="you@company.co.za" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">Sign in to Vantage</Button>
            <p className="text-center text-xs text-muted-foreground">
              Demo build — any credentials will sign you in.
            </p>
          </form>

          <div className="mt-6 rounded-lg border bg-card p-4 text-sm">
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
