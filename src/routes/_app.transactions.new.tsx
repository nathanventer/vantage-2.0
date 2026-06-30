import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/services";
import { OPTIMIZER_WEIGHTS, type ScoredQuote } from "@/adapters/optimizer";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusChip } from "@/components/StatusChip";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { NewShipmentInput, Transaction } from "@/types";

export const Route = createFileRoute("/_app/transactions/new")({
  head: () => ({ meta: [{ title: "New shipment — Vantage" }] }),
  component: NewTx,
});

const CONTAINERS = ["40ft Standard", "20ft Standard", "40ft Reefer", "40ft High Cube"];

function NewTx() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<NewShipmentInput>({
    origin: "Durban Port",
    destination: "Johannesburg",
    cargo: "Containerised electronics",
    weightTons: 12,
    containerType: CONTAINERS[0],
    valueZAR: 1_500_000,
  });
  const [created, setCreated] = useState<Transaction | null>(null);
  const [ranked, setRanked] = useState<ScoredQuote[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const recommendedId = ranked[0]?.id ?? null;
  const isOverride = !!picked && picked !== recommendedId;

  const createMut = useMutation({
    mutationFn: async () => {
      const tx = await api.createShipment(form);
      const scores = await api.scoreQuotes(tx.id);
      return { tx, scores };
    },
    onSuccess: ({ tx, scores }) => {
      setCreated(tx);
      setRanked(scores);
      setPicked(scores[0]?.id ?? null);
      setStep(2);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create shipment"),
  });

  const selectMut = useMutation({
    mutationFn: async () => {
      if (!created || !picked) throw new Error("Pick a provider first");
      await api.selectQuote(created.id, picked, isOverride ? reason : undefined);
    },
    onSuccess: () => setStep(3),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not confirm quote"),
  });

  return (
    <div>
      <PageHeader
        title="New shipment request"
        description="Create a request, review Optimizer-ranked providers, confirm a quote."
      />

      <div className="mb-6 flex items-center gap-2 text-xs">
        {["Request", "Matched providers", "Confirm"].map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full font-semibold",
                  step > n
                    ? "bg-ok text-ok-bg"
                    : step === n
                      ? "bg-brand text-brand-fg"
                      : "bg-inset text-muted-foreground",
                )}
              >
                {step > n ? <Check className="h-3.5 w-3.5" /> : n}
              </div>
              <span
                className={step === n ? "font-medium text-foreground" : "text-muted-foreground"}
              >
                {label}
              </span>
              {i < 2 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-6">
        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Fld label="Origin">
              <Input
                value={form.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value })}
              />
            </Fld>
            <Fld label="Destination">
              <Input
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
              />
            </Fld>
            <Fld label="Cargo description">
              <Input
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              />
            </Fld>
            <Fld label="Weight (tons)">
              <Input
                type="number"
                value={form.weightTons}
                onChange={(e) => setForm({ ...form, weightTons: Number(e.target.value) })}
              />
            </Fld>
            <Fld label="Container type">
              <select
                value={form.containerType}
                onChange={(e) => setForm({ ...form, containerType: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-inset px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CONTAINERS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Fld>
            <Fld label="Cargo value (ZAR)">
              <Input
                type="number"
                value={form.valueZAR}
                onChange={(e) => setForm({ ...form, valueZAR: Number(e.target.value) })}
              />
            </Fld>
            <div className="flex justify-end md:col-span-2">
              <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                {createMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Match providers
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              {created?.reference} · Vantage scored {ranked.length} providers on Cost{" "}
              {OPTIMIZER_WEIGHTS.cost} / Service {OPTIMIZER_WEIGHTS.service} / Compliance{" "}
              {OPTIMIZER_WEIGHTS.compliance} / Capacity {OPTIMIZER_WEIGHTS.capacity} / Risk{" "}
              {OPTIMIZER_WEIGHTS.risk}.
            </p>
            <div className="space-y-3">
              {ranked.map((q) => {
                const isRec = q.id === recommendedId;
                const active = picked === q.id;
                return (
                  <label
                    key={q.id}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4 transition",
                      active ? "border-brand bg-brand-soft" : "hover:bg-surface-2",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <input
                        type="radio"
                        name="prov"
                        checked={active}
                        onChange={() => setPicked(q.id)}
                        className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium" title={q.providerName}>
                            {q.providerName}
                          </span>
                          {isRec && (
                            <span className="shrink-0 rounded-full border border-ok-bd bg-ok-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ok">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          ETA {q.etaDays} days · Score {q.totalScore}/100 (cost {q.costScore} ·
                          service {q.serviceScore} · compliance {q.complianceScoreWeighted})
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <div className="font-display text-lg font-semibold tabular-nums">
                          {formatZAR(q.priceZAR)}
                        </div>
                        <div className="text-[11px] tabular-nums text-muted-foreground">
                          Rank #{q.rank}
                        </div>
                      </div>
                      <StatusChip status="Quoted" />
                    </div>
                  </label>
                );
              })}
            </div>

            {isOverride && (
              <div className="mt-4 rounded-lg border border-warn-bd bg-warn-bg/40 p-4">
                <Label htmlFor="override" className="text-warn">
                  Override reason (required)
                </Label>
                <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
                  You're not selecting the recommended provider. Record why for the audit trail.
                </p>
                <textarea
                  id="override"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-inset px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="e.g. preferred carrier for reefer cargo / existing SLA"
                />
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                disabled={!picked || (isOverride && !reason.trim()) || selectMut.isPending}
                onClick={() => selectMut.mutate()}
              >
                {selectMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm selection <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && created && (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok text-ok-bg">
              <Check className="h-7 w-7" />
            </div>
            <h3 className="mt-3 font-display text-xl font-semibold">Shipment created</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {created.reference} created with{" "}
              {ranked.find((q) => q.id === picked)?.providerName ?? "selected provider"}.
            </p>
            <Button
              className="mt-6"
              onClick={() => {
                toast.success(`${created.reference} created`);
                navigate({ to: "/transactions/$id", params: { id: created.id } });
              }}
            >
              View shipment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
