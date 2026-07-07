import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { EDGE_LIVE, invokeEdge } from "@/lib/edge";

/**
 * DocumentRenderer seam — client-side PDF generation (jsPDF). Used by the
 * documents and reports modules so no component embeds a PDF library directly.
 */
export interface RenderField {
  label: string;
  value: string;
}

export interface RenderTable {
  columns: string[];
  rows: (string | number)[][];
}

export interface RenderDoc {
  title: string;
  subtitle?: string;
  reference?: string;
  fields?: RenderField[];
  tables?: RenderTable[];
  footer?: string;
}

export interface DocumentRenderer {
  /** Build a PDF Blob for in-app preview / upload (client-side, instant). */
  toBlob(doc: RenderDoc): Blob;
  /** Build and trigger a browser download (client-side, instant). */
  download(doc: RenderDoc, filename: string): void;
  /**
   * Produce the canonical, branded PDF server-side and store it in the private
   * transaction-docs bucket (via the render-pdf edge function), returning a
   * signed URL. Returns null when edge functions are not live (use download()).
   */
  archive(doc: RenderDoc, path: string): Promise<{ path: string; url: string | null } | null>;
}

const BRAND: [number, number, number] = [47, 107, 255];
const INK: [number, number, number] = [15, 22, 38];

function build(doc: RenderDoc): jsPDF {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;

  pdf.setFillColor(...INK);
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 70, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("VANTAGE", margin, 34);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(180, 200, 255);
  pdf.text("Integrated Trade & Logistics Platform", margin, 50);
  y = 96;

  pdf.setTextColor(...INK);
  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  pdf.text(doc.title, margin, y);
  y += 16;
  if (doc.subtitle) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(110, 120, 140);
    pdf.text(doc.subtitle, margin, y);
    y += 14;
  }
  if (doc.reference) {
    pdf.setFontSize(9);
    pdf.setTextColor(...BRAND);
    pdf.text(`Ref: ${doc.reference}`, margin, y);
    y += 16;
  }

  if (doc.fields?.length) {
    autoTable(pdf, {
      startY: y + 4,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 3, textColor: INK },
      body: doc.fields.map((f) => [
        {
          content: f.label,
          styles: { fontStyle: "bold", textColor: [90, 100, 120] as [number, number, number] },
        },
        f.value,
      ]),
      columnStyles: { 0: { cellWidth: 160 } },
    });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  for (const t of doc.tables ?? []) {
    autoTable(pdf, {
      startY: y,
      head: [t.columns],
      body: t.rows.map((r) => r.map((c) => String(c))),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [244, 247, 252] },
    });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  const footer = doc.footer ?? `Generated ${new Date().toLocaleString("en-ZA")}`;
  pdf.setFontSize(8);
  pdf.setTextColor(150, 160, 175);
  pdf.text(footer, margin, pdf.internal.pageSize.getHeight() - 24);

  return pdf;
}

export const documentRenderer: DocumentRenderer = {
  toBlob(doc) {
    return build(doc).output("blob");
  },
  download(doc, filename) {
    build(doc).save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  },
  async archive(doc, path) {
    if (!EDGE_LIVE) return null;
    return invokeEdge<{ path: string; url: string | null }>("render-pdf", { doc, path });
  },
};
