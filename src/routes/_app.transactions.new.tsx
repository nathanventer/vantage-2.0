import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/transactions/new")({
  head: () => ({ meta: [{ title: "New shipment — Vantage" }] }),
  component: NewTx,
});

const PROVIDERS = [
  { name: "Maersk SA Forwarding", rating: 4.8, capacity: "High", price: 142000, eta: 7 },
  { name: "Bidvest Panalpina", rating: 4.6, capacity: "Med", price: 128500, eta: 9 },
  { name: "Imperial Logistics", rating: 4.5, capacity: "High", price: 135000, eta: 8 },
  { name: "DSV South Africa", rating: 4.7, capacity: "High", price: 151000, eta: 6 },
];

function NewTx() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [picked, setPicked] = useState<string | null>(null);

  const fmt = (n: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <PageHeader title="New shipment request" description="Create a request, review matched providers, confirm a quote." />

      <div className="mb-6 flex items-center gap-2 text-xs">
        {["Request", "Matched providers", "Confirm"].map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={cn("flex h-6 w-6 items-center justify-center rounded-full font-semibold",
                step > n ? "bg-success text-success-foreground" : step === n ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>
                {step > n ? <Check className="h-3.5 w-3.5" /> : n}
              </div>
              <span className={step === n ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
              {i < 2 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-6">
        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Fld label="Origin"><Input defaultValue="Durban Port" /></Fld>
            <Fld label="Destination"><Input defaultValue="Johannesburg" /></Fld>
            <Fld label="Cargo description"><Input defaultValue="Containerised electronics" /></Fld>
            <Fld label="Weight (tons)"><Input type="number" defaultValue={12} /></Fld>
            <Fld label="Container type">
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option>40ft Standard</option><option>20ft Standard</option><option>40ft Reefer</option>
              </select>
            </Fld>
            <Fld label="Target ready date"><Input type="date" /></Fld>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={() => setStep(2)}>
                Match providers <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">Vantage matched 4 providers based on route, capacity, and SLA history.</p>
            <div className="space-y-3">
              {PROVIDERS.map((p) => (
                <label key={p.name} className={cn("flex cursor-pointer items-center justify-between rounded-lg border p-4 transition", picked === p.name && "border-accent bg-accent/5")}>
                  <div className="flex items-center gap-4">
                    <input type="radio" name="prov" checked={picked === p.name} onChange={() => setPicked(p.name)} className="h-4 w-4 accent-accent" />
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">Rating {p.rating} · Capacity {p.capacity} · ETA {p.eta} days</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-display text-lg font-semibold">{fmt(p.price)}</div>
                    <StatusBadge status="Quoted" />
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button disabled={!picked} onClick={() => setStep(3)}>
                Accept quote <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground">
              <Check className="h-7 w-7" />
            </div>
            <h3 className="mt-3 font-display text-xl font-semibold">Transaction created</h3>
            <p className="mt-1 text-sm text-muted-foreground">Reference VTG-TXN-1025 has been created with {picked}.</p>
            <Button
              className="mt-6"
              onClick={() => {
                toast.success("Transaction VTG-TXN-1025 created");
                navigate({ to: "/transactions" });
              }}
            >
              View transactions
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
