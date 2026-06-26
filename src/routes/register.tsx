import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { Check, Upload, ShieldCheck, ArrowRight, ArrowLeft, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import logoAsset from "@/assets/vantage-logo.png.asset.json";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — Vantage" },
      { name: "description", content: "Register your company on Vantage in 8 guided steps." },
    ],
  }),
  component: RegisterPage,
});

const STEPS = [
  "Select category", "Company details", "Upload documents", "Automated verification",
  "Compliance review", "Approval", "Account activation", "Service profiling",
];

const DOC_TILES = [
  "Company registration (CIPC)", "Tax clearance certificate", "Banking confirmation",
  "Director ID", "SARS registration", "Insurance certificate", "Operating licence", "B-BBEE certificate",
];

const GOV_ITEMS = [
  "Company registration", "Tax", "Banking", "Director", "SARS", "Insurance", "Licensing", "B-BBEE",
];

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<"Demand" | "Source">("Demand");
  const [company, setCompany] = useState("");
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src={logoAsset.url} alt="" className="h-8 w-8 rounded bg-primary p-1" />
            <span className="font-display text-lg font-bold">VANTAGE</span>
          </div>
          <Button variant="ghost" onClick={() => navigate({ to: "/" })}>Cancel</Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Stepper */}
          <aside className="space-y-1">
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Onboarding</h2>
            {STEPS.map((label, i) => {
              const done = i < step, active = i === step;
              return (
                <div key={label} className={cn("flex items-start gap-3 rounded-lg p-2 text-sm", active && "bg-accent/10")}>
                  <div className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    done && "bg-success text-success-foreground",
                    active && "bg-accent text-accent-foreground",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}>
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={cn(active ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
                </div>
              );
            })}
          </aside>

          {/* Content */}
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-accent">Step {step + 1} of {STEPS.length}</div>
            <h1 className="font-display text-2xl font-semibold">{STEPS[step]}</h1>
            <Progress value={((step + 1) / STEPS.length) * 100} className="mt-4 h-1.5" />

            <div className="mt-6 min-h-[320px]">
              {step === 0 && (
                <RadioGroup value={category} onValueChange={(v) => setCategory(v as "Demand" | "Source")} className="grid gap-3 md:grid-cols-2">
                  {(["Demand", "Source"] as const).map((c) => (
                    <label key={c} className={cn("cursor-pointer rounded-lg border p-4 transition", category === c && "border-accent bg-accent/5")}>
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value={c} id={c} className="mt-1" />
                        <div>
                          <div className="font-semibold">{c}</div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {c === "Demand" ? "Importer, exporter, manufacturer, retailer or commodity trader requesting logistics services." : "Freight forwarder, clearing agent, warehouse operator or transport company fulfilling logistics services."}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Company name" value={company} onChange={setCompany} placeholder="Cape Imports (Pty) Ltd" />
                  <Field label="Registration number" placeholder="2019/123456/07" />
                  <Field label="Tax / VAT number" placeholder="4123456789" />
                  <Field label="Primary contact" placeholder="Jane Pretorius" />
                  <Field label="Contact email" type="email" placeholder="ops@company.co.za" />
                  <Field label="Contact phone" placeholder="+27 21 555 0100" />
                  <div className="md:col-span-2">
                    <Label className="mb-1.5 block">Role sub-type</Label>
                    <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {(category === "Demand"
                        ? ["Importer", "Exporter", "Manufacturer", "Retailer", "Commodity Trader"]
                        : ["Freight Forwarder", "Clearing Agent", "Warehouse Operator", "Transport Company", "Bulk Handling", "Container Depot"])
                        .map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {DOC_TILES.map((d) => (
                    <button
                      key={d}
                      onClick={() => { setUploaded((u) => ({ ...u, [d]: true })); toast.success(`${d} uploaded`); }}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3 text-left transition hover:border-accent",
                        uploaded[d] && "border-success bg-success/5",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("rounded p-2", uploaded[d] ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                          {uploaded[d] ? <FileCheck className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{d}</div>
                          <div className="text-xs text-muted-foreground">{uploaded[d] ? "Uploaded · PDF, 1.2 MB" : "Click to upload"}</div>
                        </div>
                      </div>
                      {uploaded[d] && <StatusBadge status="Verified" />}
                    </button>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div>
                  <p className="text-sm text-muted-foreground">Running automated checks against governance and compliance registries.</p>
                  <ul className="mt-4 space-y-2">
                    {GOV_ITEMS.map((g, i) => (
                      <li key={g} className="flex items-center justify-between rounded-lg border bg-card p-3">
                        <span className="text-sm font-medium">{g}</span>
                        <StatusBadge status={i % 4 === 3 ? "Pending" : "Verified"} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <ShieldCheck className="h-12 w-12 text-accent" />
                  <h3 className="font-display text-lg font-semibold">Under compliance review</h3>
                  <p className="max-w-md text-sm text-muted-foreground">A Vantage compliance administrator is reviewing your submission. You'll be notified of the outcome shortly.</p>
                  <StatusBadge status="Under Review" />
                </div>
              )}

              {step === 5 && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground">
                    <Check className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold">Application approved</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Your registration has been approved.</p>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Activate your account to access the platform.</p>
                  <Field label="Choose username" placeholder="company-admin" />
                  <Field label="Password" type="password" />
                  <Field label="Confirm password" type="password" />
                </div>
              )}

              {step === 7 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Tell us about the services you offer or need so we can match you correctly.</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {["Ocean freight", "Road transport", "Bonded warehousing", "Customs clearing", "Container depot", "Cold chain"].map((s) => (
                      <label key={s} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                        <input type="checkbox" className="h-4 w-4 accent-accent" defaultChecked />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between border-t pt-4">
              <Button variant="outline" onClick={prev} disabled={step === 0}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={next} className="bg-primary hover:bg-primary/90">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => { toast.success("Onboarding complete"); navigate({ to: "/dashboard" }); }} className="bg-success hover:bg-success/90 text-success-foreground">
                  Enter Vantage <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type FieldProps = { label: string; value?: string; onChange?: (v: string) => void }
  & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;
function Field({ label, value, onChange, ...rest }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange?.(e.target.value)} {...rest} />
    </div>
  );
}
