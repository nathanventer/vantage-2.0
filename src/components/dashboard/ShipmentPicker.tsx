import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "@/components/StatusBadge";
import { txnRefNumber } from "@/lib/references";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

function compareByTxnRef(a: Transaction, b: Transaction): number {
  const na = txnRefNumber(a.reference);
  const nb = txnRefNumber(b.reference);
  if (na != null && nb != null && na !== nb) return na - nb;
  if (na != null && nb == null) return -1;
  if (na == null && nb != null) return 1;
  return a.reference.localeCompare(b.reference);
}

type ShipmentPickerProps = {
  transactions: Transaction[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

export function ShipmentPicker({ transactions, value, onChange, className }: ShipmentPickerProps) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() => [...transactions].sort(compareByTxnRef), [transactions]);
  const selected = sorted.find((t) => t.id === value) ?? sorted[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select shipment"
          className={cn(
            "h-8 w-[min(100%,13rem)] justify-between gap-2 border-input bg-inset px-2.5 text-xs font-medium shadow-none",
            className,
          )}
        >
          <span className="truncate tabular-nums">{selected?.reference ?? "Select…"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="end">
        <Command
          filter={(itemValue, search) => {
            const q = search.trim().toLowerCase();
            if (!q) return 1;
            const hay = itemValue.toLowerCase();
            if (hay.includes(q)) return 1;
            const digits = q.replace(/\D/g, "");
            if (digits && hay.includes(digits)) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Search reference or route…" className="h-9 text-xs" />
          <CommandList className="max-h-[min(60vh,22rem)]">
            <CommandEmpty>No shipment found.</CommandEmpty>
            <CommandGroup
              heading={`${sorted.length} shipment${sorted.length === 1 ? "" : "s"} · TXN order`}
            >
              {sorted.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.reference} ${t.origin} ${t.destination} ${t.status}`}
                  onSelect={() => {
                    onChange(t.id);
                    setOpen(false);
                  }}
                  className="gap-2 py-2"
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-brand",
                      value === t.id ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs font-semibold tabular-nums">
                        {t.reference}
                      </span>
                      <StatusBadge status={t.status} className="shrink-0 scale-90" />
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {t.origin} → {t.destination}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
