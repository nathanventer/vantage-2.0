import * as XLSX from "xlsx";
import { documentRenderer } from "@/adapters/documentRenderer";

/**
 * Reporting export service. Pages build a ReportExport and call one method —
 * export logic lives here, never inline in a component. CSV is hand-rolled,
 * XLSX uses SheetJS, PDF uses the DocumentRenderer port (jsPDF).
 */
export interface ReportExport {
  /** File base name (no extension). */
  name: string;
  title: string;
  columns: string[];
  rows: (string | number)[][];
  /** Optional KPI / period rows rendered in the PDF header. */
  meta?: { label: string; value: string }[];
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ReportingService {
  csv(r: ReportExport): void;
  xlsx(r: ReportExport): void;
  pdf(r: ReportExport): void;
}

export const reportingService: ReportingService = {
  csv(r) {
    const lines = [r.columns, ...r.rows].map((row) => row.map(csvCell).join(","));
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${r.name}.csv`);
  },

  xlsx(r) {
    const ws = XLSX.utils.aoa_to_sheet([r.columns, ...r.rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, r.title.slice(0, 31) || "Report");
    XLSX.writeFile(wb, `${r.name}.xlsx`);
  },

  pdf(r) {
    documentRenderer.download(
      {
        title: r.title,
        subtitle: "VANTAGE report",
        fields: r.meta,
        tables: [{ columns: r.columns, rows: r.rows }],
        footer: `Generated ${new Date().toLocaleString("en-ZA")}`,
      },
      r.name,
    );
  },
};
