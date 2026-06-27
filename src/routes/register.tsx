import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { GovernancePanel, type GovernanceItem } from "@/components/GovernancePanel";
import { Dropzone } from "@/components/Dropzone";
import { Check, ShieldCheck, ArrowRight, ArrowLeft, X as XIcon } from "lucide-react";
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
  "Select category",
  "Company details",
  "Upload documents",
  "Automated verification",
  "Review & submit",
  "Compliance review",
  "Approval",
  "Account & profile",
];

const GOV_BASE: Omit<GovernanceItem, "status">[] = [
  { item: "Company registration (CIPC)" },
  { item: "Tax clearance" },
  { item: "Banking confirmation" },
  { item: "Director ID" },
  { item: "SARS registration" },
  { item: "Insurance certificate" },
  { item: "Operating licence" },
  { item: "B-BBEE certificate", optional: true, note: "Where applicable" },
];

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<"Demand" | "Source">("Demand");
  const [company, setCompany] = useState("");
  const [regNo, setRegNo] = useState("");
  const [vat, setVat] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [subType, setSubType] = useState("Importer");
  const [bbbeeSkip, setBbbeeSkip] = useState(false);
  const [reviewOutcome, setReviewOutcome] = useState<"approved" | "rejected">("approved");
  const [rejectReason, setRejectReason] = useState("Tax clearance document expired — please re-upload a current certificate.");

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const govItems: GovernanceItem[] = GOV_BASE.map((g) => {
    if (g.item.startsWith("B-BBEE") && bbbeeSkip) return { ...g, status: "Verified", note: "Skipped (not applicable)" } as GovernanceItem;
    return { ...g, status: g.item.startsWith("SARS") ? "Pending" : "Verified" } as GovernanceItem;
  });

  return (
    <div className="min-h-dvh bg-background">
      <header className="glass sticky top-0 z-30 border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <img src={logoAsset.url} alt="" className="h-8 w-8 rounded bg-primary p-1" />
            <span className="font-display text-lg font-bold">VANTAGE</span>
          </div>
          <Button variant="ghost" onClick={() => navigate({ to: "/" })}>Cancel</Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr_280px]">
          {/* Stepper */}
          <aside className="space-y-1 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
            <h2 className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Onboarding</h2>
            {STEPS.map((label, i) => {
              const done = i < step, active = i === step;
              return (
                <button
                  key={label}
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg p-2 text-left text-sm transition",
                    active && "bg-accent/10",
                    !active && i < step && "hover:bg-muted/50",
                    i > step && "cursor-default opacity-60",
                  )}
                >
                  <div className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    done && "bg-success text-success-foreground",
                    active && "bg-accent text-accent-foreground",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}>
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={cn(active ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
                </button>
              );
            })}
          </aside>

          {/* Content */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Step {step + 1} of {STEPS.length}</div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{STEPS[step]}</h1>
            <Progress value={((step + 1) / STEPS.length) * 100} className="mt-4 h-1.5" />

            <div className="mt-6 min-h-[340px]">
              {step === 0 && (
                <RadioGroup value={category} onValueChange={(v) => setCategory(v as "Demand" | "Source")} className="grid gap-3 md:grid-cols-2">
                  {(["Demand", "Source"] as const).map((c) => (
                    <label key={c} className={cn("cursor-pointer rounded-xl border p-4 transition", category === c ? "border-accent bg-accent/5" : "hover:border-accent/40")}>
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
                  <Field label="Company name" value={company} onChange={setCompany} placeholder="Cape Imports (Pty) Ltd" required />
                  <Field label="Registration number" value={regNo} onChange={setRegNo} placeholder="2019/123456/07" />
                  <Field label="Tax / VAT number" value={vat} onChange={setVat} placeholder="4123456789" />
                  <Field label="Primary contact" value={contactName} onChange={setContactName} placeholder="Jane Pretorius" />
                  <Field label="Contact email" type="email" value={contactEmail} onChange={setContactEmail} placeholder="ops@company.co.za" />
                  <Field label="Contact phone" placeholder="+27 21 555 0100" />
                  <div className="md:col-span-2">
                    <Label className="mb-1.5 block">Role sub-type</Label>
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {(category === "Demand"
                        ? ["Importer", "Exporter", "Manufacturer", "Retailer", "Commodity Trader"]
                        : ["Freight Forwarder", "Clearing Agent", "Warehouse Operator", "Transport Company", "Bulk Handling", "Container Depot"])
                        .map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-accent"
                      checked={bbbeeSkip}
                      onChange={(e) => setBbbeeSkip(e.target.checked)}
                    />
                    B-BBEE certificate not applicable to this entity
                  </label>
                  <Dropzone
                    label="Drop governance & compliance documents"
                    hint="CIPC, Tax, Banking, Director ID, SARS, Insurance, Licensing, B-BBEE — PDF/PNG up to 10 MB"
                    onFile={(n) => toast.success(`${n} uploaded & queued for verification`)}
                  />
                </div>
              )}

              {step === 3 && (
                <div>
                  <p className="text-sm text-muted-foreground">Running automated checks against governance and compliance registries (simulated).</p>
                  <div className="mt-4">
                    <GovernancePanel items={govItems} title="Verification results" description="Outcomes will be confirmed by a compliance reviewer in the next step." />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Review your submission before sending to compliance.</p>
                  <ReviewBlock title="Category">{category}{` — ${subType}`}</ReviewBlock>
                  <ReviewBlock title="Company">
                    <dl className="grid grid-cols-2 gap-y-1 text-sm">
                      <dt className="text-muted-foreground">Name</dt><dd>{company || "—"}</dd>
                      <dt className="text-muted-foreground">Reg no.</dt><dd>{regNo || "—"}</dd>
                      <dt className="text-muted-foreground">VAT</dt><dd>{vat || "—"}</dd>
                      <dt className="text-muted-foreground">Contact</dt><dd>{contactName || "—"}</dd>
                      <dt className="text-muted-foreground">Email</dt><dd>{contactEmail || "—"}</dd>
                    </dl>
                  </ReviewBlock>
                  <ReviewBlock title="Governance checks">
                    <ul className="grid gap-1 text-sm md:grid-cols-2">
                      {govItems.map((g) => (
                        <li key={g.item} className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">{g.item}</span>
                          <StatusBadge status={g.status} />
                        </li>
                      ))}
                    </ul>
                  </ReviewBlock>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 py-10 text-center">
                    <ShieldCheck className="h-12 w-12 text-accent" />
                    <h3 className="font-display text-lg font-semibold">Under compliance review</h3>
                    <p className="max-w-md text-sm text-muted-foreground">A Vantage compliance administrator is reviewing your submission. You'll be notified of the outcome.</p>
                    <StatusBadge status="Under Review" />
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Demo: simulate outcome</Label>
                    <RadioGroup value={reviewOutcome} onValueChange={(v) => setReviewOutcome(v as "approved" | "rejected")} className="grid gap-2 sm:grid-cols-2">
                      <label className={cn("flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm", reviewOutcome === "approved" && "border-success bg-success/5")}>
                        <RadioGroupItem value="approved" /> Approved
                      </label>
                      <label className={cn("flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm", reviewOutcome === "rejected" && "border-destructive bg-destructive/5")}>
                        <RadioGroupItem value="rejected" /> Rejected (with reason)
                      </label>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {step === 6 && (
                reviewOutcome === "approved" ? (
                  <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground">
                      <Check className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold">Application approved</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Your registration has been approved. Continue to activate your account.</p>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                        <XIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-semibold">Application requires changes</h3>
                        <p className="text-sm text-muted-foreground">Address the reviewer's notes and resubmit.</p>
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Reviewer notes</Label>
                      <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} />
                    </div>
                    <Button variant="outline" onClick={() => { setStep(2); toast.info("Returned to document upload"); }}>
                      Resubmit documents
                    </Button>
                  </div>
                )
              )}

              {step === 7 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Activate your account and tell us about the services you offer or need.</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Choose username" placeholder="company-admin" />
                    <Field label="Password" type="password" />
                  </div>
                  <div>
                    <Label className="mb-2 block">Service profile</Label>
                    <div className="grid gap-2 md:grid-cols-2">
                      {["Ocean freight", "Road transport", "Bonded warehousing", "Customs clearing", "Container depot", "Cold chain"].map((s) => (
                        <label key={s} className="flex items-center gap-2 rounded-lg border bg-background/40 p-2.5 text-sm">
                          <input type="checkbox" className="h-4 w-4 accent-accent" defaultChecked />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between border-t pt-4">
              <Button variant="outline" onClick={prev} disabled={step === 0}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  onClick={next}
                  disabled={step === 6 && reviewOutcome === "rejected"}
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => { toast.success("Onboarding complete — welcome to Vantage"); navigate({ to: "/dashboard" }); }} className="bg-success hover:bg-success/90 text-success-foreground">
                  Enter Vantage <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Persistent summary */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-3 rounded-2xl border bg-card p-5 shadow-xs">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Application summary</div>
              <div>
                <div className="text-xs text-muted-foreground">Company</div>
                <div className="font-medium">{company || "Not entered"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Category</div>
                <div className="font-medium">{category} · <span className="text-muted-foreground">{subType}</span></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">B-BBEE</div>
                <div className="font-medium">{bbbeeSkip ? "Not applicable" : "Required"}</div>
              </div>
              <div className="border-t pt-3">
                <div className="text-xs text-muted-foreground">Progress</div>
                <div className="font-display text-2xl font-semibold tracking-tight tabular-nums">{step + 1}<span className="text-sm text-muted-foreground"> / {STEPS.length}</span></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-background/40 p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

type FieldProps = { label: string; value?: string; onChange?: (v: string) => void }
  & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;
function Field({ label, value, onChange, ...rest }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{rest.required && <span className="ml-0.5 text-destructive">*</span>}</Label>
      <Input value={value} onChange={(e) => onChange?.(e.target.value)} {...rest} />
    </div>
  );
}
