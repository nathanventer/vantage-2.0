import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/UserMenu";
import { api } from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusChip } from "@/components/StatusChip";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  ShieldCheck,
  Clock,
  X as XIcon,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VantageLogo } from "@/components/VantageLogo";
import type { CompanyInput } from "@/types";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register — Vantage" }] }),
  component: RegisterPage,
});

const STEPS = [
  "Account type",
  "Company details",
  "Compliance documents",
  "Review & submit",
  "Under review",
  "Decision",
  "Activate account",
  "Service profile",
];

const DOC_ITEMS: { label: string; type: string; optional?: boolean }[] = [
  { label: "Company Registration", type: "company_registration" },
  { label: "Tax Clearance", type: "tax_clearance" },
  { label: "Banking Proof", type: "bank_confirmation" },
  { label: "Director ID", type: "director_id" },
  { label: "SARS Registration", type: "sars_registration" },
  { label: "Insurance", type: "insurance" },
  { label: "Operating Licence", type: "operating_license" },
  { label: "B-BBEE", type: "bbbee_certificate", optional: true },
];

const SUBTYPES: Record<"Demand" | "Source", string[]> = {
  Demand: ["Importer", "Exporter", "Manufacturer", "Retailer", "Commodity Trader"],
  Source: [
    "Freight Forwarder",
    "Clearing Agent",
    "Warehouse Operator",
    "Transport Company",
    "Container Depot",
  ],
};

function RegisterPage() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<"Demand" | "Source">("Demand");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    regNo: "",
    vat: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    subType: "Importer",
  });
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  // Auth guard + resume position.
  useEffect(() => {
    if (!user) {
      navigate({ to: "/" });
      return;
    }
    if (user.companyApproved) {
      navigate({ to: "/dashboard" });
      return;
    }
    setCompanyId(user.companyId ?? null);
    setStep((s) =>
      s === 0 ? Math.min(Math.max((user.onboardingStep ?? 1) - 1, 0), STEPS.length - 1) : s,
    );
  }, [user, navigate]);

  // The applicant's own registration (RLS scopes to their company).
  const { data: myReg, refetch: refetchReg } = useQuery({
    queryKey: ["myreg", user?.companyId],
    queryFn: async () => {
      const all = await api.listRegistrations();
      return all.find((r) => r.companyId === user?.companyId) ?? null;
    },
    enabled: !!user?.companyId,
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function persistStep(next: number) {
    setStep(next);
    try {
      await api.updateOnboardingStep(next + 1);
    } catch {
      /* non-fatal */
    }
  }

  // Step actions -------------------------------------------------------------
  async function continueCategory() {
    setBusy(true);
    try {
      await api.setRoleIntent(category === "Source" ? "source" : "demand");
      await persistStep(1);
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setBusy(false);
    }
  }

  async function continueCompany() {
    if (!form.name.trim()) return toast.error("Company name is required.");
    setBusy(true);
    try {
      const input: CompanyInput = {
        name: form.name.trim(),
        type: category === "Source" ? "source" : "demand",
        registrationNumber: form.regNo,
        vatNumber: form.vat,
        contactPerson: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        subType: form.subType,
      };
      const id = await api.saveCompany(input);
      setCompanyId(id);
      await persistStep(2);
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setBusy(false);
    }
  }

  async function markUploaded(type: string, label: string, file: File) {
    if (!companyId) return toast.error("Save your company details first.");
    try {
      await api.recordComplianceDocument(companyId, type, file);
      setUploaded((u) => ({ ...u, [type]: true }));
      toast.success(`${label} uploaded`);
    } catch (e) {
      toast.error(msg(e));
    }
  }

  const requiredDone = DOC_ITEMS.filter((d) => !d.optional).every((d) => uploaded[d.type]);

  async function submitForReview() {
    if (!companyId) return;
    setBusy(true);
    try {
      await api.submitCompanyForReview(companyId);
      await api.updateOnboardingStep(5);
      await refresh();
      await refetchReg();
      setStep(4);
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setBusy(false);
    }
  }

  async function checkStatus() {
    setBusy(true);
    try {
      await refresh();
      const r = await refetchReg();
      const status = r.data?.status;
      if (status === "Approved") setStep(5);
      else if (status === "Rejected") setStep(5);
      else toast.info("Still under review — approval can take up to 48 hours.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      await api.updateOnboardingStep(8);
      await refresh();
      navigate({ to: "/dashboard" });
    } finally {
      setBusy(false);
    }
  }

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="min-h-dvh bg-app">
      <header className="glass sticky top-0 z-30 border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <VantageLogo size="md" />
          <UserMenu />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Stepper */}
          <aside className="space-y-1">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Onboarding
            </h2>
            {STEPS.map((label, i) => {
              const done = i < step,
                active = i === step;
              return (
                <div
                  key={label}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-2 text-sm",
                    active && "bg-brand-soft",
                    i > step && "opacity-50",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      done && "bg-ok text-[#052016]",
                      active && "bg-brand text-white",
                      !done && !active && "bg-surface-2 text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "truncate",
                      active ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </aside>

          {/* Content */}
          <div className="overflow-hidden rounded-2xl border bg-card p-6 shadow-md sheen sm:p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
              Step {step + 1} of {STEPS.length}
            </div>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
              {STEPS[step]}
            </h1>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-inset">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, var(--grad-from), var(--grad-to))",
                }}
              />
            </div>

            <div className="mt-6 min-h-[320px]">
              {/* 0 — Account type */}
              {step === 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {(["Demand", "Source"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCategory(c);
                        set("subType", SUBTYPES[c][0]);
                      }}
                      className={cn(
                        "rounded-2xl border p-5 text-left transition",
                        category === c
                          ? "border-brand bg-brand-soft ring-2 ring-brand/40"
                          : "hover:border-brand/40 hover:bg-surface-2",
                      )}
                    >
                      <div className="font-display text-lg font-semibold">{c}</div>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {c === "Demand"
                          ? "Importer, exporter, manufacturer, retailer or trader requesting logistics services."
                          : "Freight forwarder, clearing agent, warehouse or transport operator fulfilling services."}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* 1 — Company details */}
              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Company name"
                    value={form.name}
                    onChange={(v) => set("name", v)}
                    placeholder="Cape Imports (Pty) Ltd"
                    required
                  />
                  <Field
                    label="Registration number"
                    value={form.regNo}
                    onChange={(v) => set("regNo", v)}
                    placeholder="2019/123456/07"
                  />
                  <Field
                    label="Tax / VAT number"
                    value={form.vat}
                    onChange={(v) => set("vat", v)}
                    placeholder="4123456789"
                  />
                  <Field
                    label="Primary contact"
                    value={form.contactName}
                    onChange={(v) => set("contactName", v)}
                    placeholder="Jane Pretorius"
                  />
                  <Field
                    label="Contact email"
                    type="email"
                    value={form.contactEmail}
                    onChange={(v) => set("contactEmail", v)}
                    placeholder="ops@company.co.za"
                  />
                  <Field
                    label="Contact phone"
                    value={form.contactPhone}
                    onChange={(v) => set("contactPhone", v)}
                    placeholder="+27 21 555 0100"
                  />
                  <div className="md:col-span-2">
                    <Label className="mb-1.5 block">Role sub-type</Label>
                    <select
                      value={form.subType}
                      onChange={(e) => set("subType", e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-inset px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {SUBTYPES[category].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 2 — Compliance documents (manual) */}
              {step === 2 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Upload each required document. A compliance administrator verifies them
                    manually.
                  </p>
                  {DOC_ITEMS.map((d) => (
                    <div
                      key={d.type}
                      className="flex items-center gap-3 rounded-xl border bg-inset px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {d.label}
                          {d.optional && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              (if applicable)
                            </span>
                          )}
                        </div>
                      </div>
                      {uploaded[d.type] ? (
                        <StatusChip status="verified" />
                      ) : (
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-surface-2">
                          <UploadCloud className="h-3.5 w-3.5" /> Upload
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) markUploaded(d.type, d.label, f);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 3 — Review & submit */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Review your application, then submit for manual compliance review.
                  </p>
                  <ReviewBlock title="Company">
                    <dl className="grid grid-cols-3 gap-y-1.5 text-sm">
                      <dt className="text-muted-foreground">Name</dt>
                      <dd className="col-span-2">{form.name || "—"}</dd>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="col-span-2">
                        {category} · {form.subType}
                      </dd>
                      <dt className="text-muted-foreground">Reg / VAT</dt>
                      <dd className="col-span-2">
                        {form.regNo || "—"} · {form.vat || "—"}
                      </dd>
                      <dt className="text-muted-foreground">Contact</dt>
                      <dd className="col-span-2 truncate">
                        {form.contactName || "—"} · {form.contactEmail || "—"}
                      </dd>
                    </dl>
                  </ReviewBlock>
                  <ReviewBlock title="Documents">
                    <ul className="grid gap-1 text-sm sm:grid-cols-2">
                      {DOC_ITEMS.map((d) => (
                        <li key={d.type} className="flex items-center justify-between gap-2">
                          <span className="truncate text-muted-foreground">{d.label}</span>
                          <StatusChip status={uploaded[d.type] ? "submitted" : "draft"} />
                        </li>
                      ))}
                    </ul>
                  </ReviewBlock>
                </div>
              )}

              {/* 4 — Under review */}
              {step === 4 && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border bg-inset py-12 text-center">
                  <Clock className="h-12 w-12 text-brand" />
                  <h3 className="font-display text-lg font-semibold">Application under review</h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    A Vantage compliance administrator is reviewing your submission. Approval can
                    take up to <strong>48 hours</strong>.
                  </p>
                  <StatusChip status={myReg?.status ?? "pending"} />
                  <Button variant="outline" className="mt-2" onClick={checkStatus} disabled={busy}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Check status
                  </Button>
                </div>
              )}

              {/* 5 — Decision */}
              {step === 5 &&
                (myReg?.status === "Rejected" ? (
                  <div className="space-y-3 rounded-2xl border border-err-bd bg-err-bg p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-err text-[#1a0509]">
                        <XIcon className="h-5 w-5" />
                      </div>
                      <h3 className="font-display text-lg font-semibold">
                        Application requires changes
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {myReg?.rejectionReason || "Please review and resubmit your documents."}
                    </p>
                    <Button variant="outline" onClick={() => persistStep(2)}>
                      Resubmit documents
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-ok-bd bg-ok-bg p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok text-[#052016]">
                      <Check className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold">
                      Application approved
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your company has been verified. Continue to activate your workspace.
                    </p>
                  </div>
                ))}

              {/* 6 — Activate */}
              {step === 6 && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border bg-inset py-12 text-center">
                  <ShieldCheck className="h-12 w-12 text-ok" />
                  <h3 className="font-display text-lg font-semibold">Account activated</h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Welcome to Vantage. Your workspace is unlocked.
                  </p>
                </div>
              )}

              {/* 7 — Service profile */}
              {step === 7 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Select the services you {category === "Source" ? "offer" : "need"}.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      "Ocean freight",
                      "Road transport",
                      "Bonded warehousing",
                      "Customs clearing",
                      "Container depot",
                      "Cold chain",
                    ].map((s) => (
                      <label
                        key={s}
                        className="flex items-center gap-2 rounded-lg border bg-inset p-2.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--brand)]"
                          defaultChecked
                        />{" "}
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer nav */}
            <div className="mt-8 flex items-center justify-between border-t pt-4">
              <Button
                variant="outline"
                onClick={() => persistStep(Math.max(0, step - 1))}
                disabled={step === 0 || step === 4 || busy}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              {step === 0 && (
                <Button onClick={continueCategory} disabled={busy}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === 1 && (
                <Button onClick={continueCompany} disabled={busy}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === 2 && (
                <Button onClick={() => persistStep(3)} disabled={busy || !requiredDone}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === 3 && (
                <Button onClick={submitForReview} disabled={busy}>
                  Submit for review <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === 4 && (
                <span className="text-xs text-muted-foreground">Awaiting admin decision</span>
              )}
              {step === 5 && myReg?.status !== "Rejected" && (
                <Button onClick={() => persistStep(6)}>
                  Activate <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === 6 && (
                <Button onClick={() => persistStep(7)}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === 7 && (
                <Button onClick={finish} disabled={busy}>
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

function msg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-inset p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

type FieldProps = { label: string; value?: string; onChange?: (v: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>;
function Field({ label, value, onChange, ...rest }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {rest.required && <span className="ml-0.5 text-err">*</span>}
      </Label>
      <Input value={value} onChange={(e) => onChange?.(e.target.value)} {...rest} />
    </div>
  );
}
