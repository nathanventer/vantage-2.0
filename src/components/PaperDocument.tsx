import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

/**
 * PaperDocument — the branded, print-ready invoice/quote sheet.
 * Modern-vintage look: cream stock, ink-black grotesk headline, hairline
 * rules, tabular numerals. Rendered inside a dialog with a print action;
 * `print-area` CSS makes only the sheet print.
 */
export interface PaperLine {
  label: string;
  amountZAR: number;
}

export interface PaperMeta {
  label: string;
  value: string;
}

export interface PaperSignature {
  signedBy?: string;
  signedAt?: string;
  token?: string;
}

export interface PaperStatus {
  label: string;
  tone: "ok" | "info" | "warn" | "muted";
}

export interface PaperDocumentProps {
  /** Headline printed top-right: INVOICE, QUOTE, or any document title. */
  kind: string;
  reference: string;
  /** Issuer (left block) */
  from: { name: string; email?: string; phone?: string; address?: string[] };
  /** Recipient (right block) */
  to: { name: string; address?: string[] };
  /** Modern status badge shown under the headline. */
  status?: PaperStatus;
  /** Key/value details grid (document facts). */
  meta?: PaperMeta[];
  sectionTitle?: string;
  /** Priced line items — totals render only when present. */
  lines?: PaperLine[];
  vatRate?: number; // default 0.15
  /** Free-text body (notes, clauses). */
  bodyText?: string;
  issuedAt?: string;
  dueAt?: string;
  bank?: { name?: string; iban?: string; swift?: string };
  terms?: string;
  /** Signature block: signed state renders the stamp; unsigned renders a rule. */
  signature?: PaperSignature | "unsigned";
  footnote?: string;
}

const STATUS_STYLES: Record<PaperStatus["tone"], { bg: string; fg: string }> = {
  ok: { bg: "#dcefe2", fg: "#1d6b3a" },
  info: { bg: "#dfe7f5", fg: "#274d8f" },
  warn: { bg: "#f5ead8", fg: "#8f5b17" },
  muted: { bg: "#e4e1d8", fg: "#5a5850" },
};

const fmt = (n: number) =>
  n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PaperDocument(p: PaperDocumentProps) {
  const vatRate = p.vatRate ?? 0.15;
  const lines = p.lines ?? [];
  const subtotal = lines.reduce((s, l) => s + l.amountZAR, 0);
  const vat = Math.round(subtotal * vatRate * 100) / 100;
  const total = subtotal + vat;

  return (
    <div
      className="print-area mx-auto w-full max-w-[640px] rounded-sm px-8 py-10 shadow-2xl sm:px-12 sm:py-14"
      style={{
        background: "linear-gradient(160deg, #f0ede6 0%, #e9e5dc 55%, #eeebe3 100%)",
        color: "#171614",
        fontFamily:
          'ui-sans-serif, "Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div
            className="text-[26px] font-extrabold leading-[1.05] tracking-tight sm:text-[30px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            {p.from.name.split(" ").slice(0, 2).join(" ")}
            {p.from.name.split(" ").length > 2 && (
              <>
                <br />
                {p.from.name.split(" ").slice(2).join(" ")}
              </>
            )}
          </div>
          <div className="mt-4 space-y-0.5 text-[12.5px]" style={{ color: "#45433e" }}>
            {p.from.email && <div>{p.from.email}</div>}
            {p.from.phone && <div>✦ {p.from.phone}</div>}
            {(p.from.address ?? []).map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-[28px] font-extrabold uppercase tracking-tight sm:text-[36px]"
            style={{ letterSpacing: "-0.01em" }}
          >
            {p.kind}
          </div>
          {p.status && (
            <span
              className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em]"
              style={{
                background: STATUS_STYLES[p.status.tone].bg,
                color: STATUS_STYLES[p.status.tone].fg,
              }}
            >
              {p.status.label}
            </span>
          )}
          <div className="mt-3 space-y-0.5 text-[12.5px]" style={{ color: "#45433e" }}>
            <div className="font-semibold" style={{ color: "#171614" }}>
              {p.to.name}
            </div>
            {(p.to.address ?? []).map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Reference strip */}
      <div
        className="mt-6 flex items-center justify-between text-[11px] uppercase tracking-[0.14em]"
        style={{ color: "#6b6963" }}
      >
        <span>Ref {p.reference}</span>
        {p.issuedAt && (
          <span>
            Issued{" "}
            {new Date(p.issuedAt).toLocaleDateString("en-ZA", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Document details */}
      {(p.meta?.length ?? 0) > 0 && (
        <div className="mt-8">
          <div
            className="flex items-end justify-between border-b pb-1.5"
            style={{ borderColor: "#171614" }}
          >
            <span className="text-[15px] font-extrabold uppercase tracking-tight">
              Document details
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2.5 sm:grid-cols-3">
            {p.meta!.map((m) => (
              <div key={m.label} className="min-w-0">
                <dt
                  className="text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "#8a877f" }}
                >
                  {m.label}
                </dt>
                <dd className="mt-0.5 break-words text-[13px] font-medium">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Services */}
      {lines.length > 0 && (
        <div className="mt-8">
          <div className="flex items-end justify-between border-b pb-1.5" style={{ borderColor: "#171614" }}>
            <span className="text-[15px] font-extrabold uppercase tracking-tight">
              {p.sectionTitle ?? "Services"}
            </span>
          </div>
          <ul>
            {lines.map((l) => (
              <li
                key={l.label}
                className="flex items-baseline justify-between gap-4 border-b py-2.5 text-[13px]"
                style={{ borderColor: "#c9c5ba" }}
              >
                <span className="min-w-0">{l.label}</span>
                <span className="shrink-0 tabular-nums">R{fmt(l.amountZAR)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Totals */}
      {lines.length > 0 && (
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-[280px] text-[13px]">
            <div className="flex justify-between border-b py-1.5" style={{ borderColor: "#c9c5ba" }}>
              <span style={{ color: "#45433e" }}>Subtotal</span>
              <span className="tabular-nums">R{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between border-b py-1.5" style={{ borderColor: "#c9c5ba" }}>
              <span style={{ color: "#45433e" }}>VAT ({Math.round(vatRate * 100)}%)</span>
              <span className="tabular-nums">R{fmt(vat)}</span>
            </div>
            <div
              className="mt-1 flex items-baseline justify-between border-b-2 py-2"
              style={{ borderColor: "#171614" }}
            >
              <span className="font-extrabold">
                {p.dueAt
                  ? `Due ${new Date(p.dueAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })}`
                  : "Total"}
              </span>
              <span className="text-[16px] font-extrabold tabular-nums">R{fmt(total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes / body copy */}
      {p.bodyText && (
        <div className="mt-8">
          <div
            className="flex items-end justify-between border-b pb-1.5"
            style={{ borderColor: "#171614" }}
          >
            <span className="text-[15px] font-extrabold uppercase tracking-tight">Notes</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: "#45433e" }}>
            {p.bodyText}
          </p>
        </div>
      )}

      {/* Bank + terms */}
      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {p.bank && (
          <div>
            <div className="text-[13px] font-extrabold uppercase tracking-tight">Bank details</div>
            <div className="mt-2 space-y-1 text-[12.5px]" style={{ color: "#45433e" }}>
              {p.bank.name && <div className="font-semibold" style={{ color: "#171614" }}>{p.bank.name}</div>}
              {p.bank.iban && <div className="tabular-nums">{p.bank.iban}</div>}
              {p.bank.swift && <div>SWIFT&nbsp;&nbsp;{p.bank.swift}</div>}
            </div>
          </div>
        )}
        <div>
          <div className="text-[13px] font-extrabold uppercase tracking-tight">Terms</div>
          <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "#45433e" }}>
            {p.terms ??
              "Payment is due within 30 days. Please make payment via bank transfer to the account specified."}
          </p>
        </div>
      </div>

      {/* Signature block */}
      {p.signature && (
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <div>
            <div className="text-[13px] font-extrabold uppercase tracking-tight">
              Authorised signature
            </div>
            {p.signature !== "unsigned" && p.signature.signedBy ? (
              <div className="mt-3">
                <div
                  className="text-[22px] leading-tight"
                  style={{ fontFamily: '"Snell Roundhand", "Segoe Script", cursive' }}
                >
                  {p.signature.signedBy}
                </div>
                <div className="mt-1 border-t pt-1.5" style={{ borderColor: "#171614" }}>
                  <div className="text-[12px] font-semibold">{p.signature.signedBy}</div>
                  <div className="text-[11px]" style={{ color: "#45433e" }}>
                    {p.signature.signedAt &&
                      new Date(p.signature.signedAt).toLocaleString("en-ZA", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-12 border-t pt-1.5" style={{ borderColor: "#171614" }}>
                <div className="text-[11px]" style={{ color: "#8a877f" }}>
                  Name &amp; signature
                </div>
              </div>
            )}
          </div>
          {p.signature !== "unsigned" && p.signature.token && (
            <div className="sm:text-right">
              <div className="text-[13px] font-extrabold uppercase tracking-tight">
                Digital verification
              </div>
              <div
                className="mt-3 inline-block rounded-md border px-3 py-2 text-left"
                style={{ borderColor: "#c9c5ba" }}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#8a877f" }}>
                  Signature token
                </div>
                <div className="mt-0.5 text-[13px] font-semibold tabular-nums">
                  {p.signature.token}
                </div>
                <div className="mt-1 text-[10.5px]" style={{ color: "#45433e" }}>
                  Electronically signed on the Vantage platform. Verify this token in the
                  document audit trail.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {p.footnote && (
        <div
          className="mt-10 border-t pt-3 text-[10.5px] uppercase tracking-[0.14em]"
          style={{ borderColor: "#c9c5ba", color: "#8a877f" }}
        >
          {p.footnote}
        </div>
      )}
    </div>
  );
}

/** Dialog wrapper with a print/PDF action. */
export function PaperDocumentDialog({
  open,
  onOpenChange,
  doc,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doc: PaperDocumentProps | null;
}) {
  if (!doc) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-none bg-transparent p-0 shadow-none sm:p-2">
        <DialogTitle className="sr-only">
          {doc.kind} {doc.reference}
        </DialogTitle>
        <div className="print-hide sticky top-0 z-10 mb-2 flex justify-end">
          <Button size="sm" variant="secondary" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print / PDF
          </Button>
        </div>
        <PaperDocument {...doc} />
      </DialogContent>
    </Dialog>
  );
}
