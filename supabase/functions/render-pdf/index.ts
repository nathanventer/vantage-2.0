// DocumentRenderer (real, server-side). Renders a branded PDF for any template
// and stores it in the private transaction-docs bucket, returning a signed URL.
// The client keeps a jsPDF fallback for instant preview; the canonical archived
// PDF is produced here.
//
// Deploy:  supabase functions deploy render-pdf
// Secrets: (none beyond the platform SUPABASE_* — uses service role for Storage)
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@^1.17";
import { adminClient, callerFromAuthHeader } from "../_shared/supabaseAdmin.ts";
import { json, preflight } from "../_shared/cors.ts";

interface RenderField {
  label: string;
  value: string;
}
interface RenderDoc {
  title: string;
  subtitle?: string;
  reference?: string;
  fields?: RenderField[];
  footer?: string;
}

async function buildPdf(doc: RenderDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4 pt
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 772, width: 595, height: 70, color: rgb(0.06, 0.09, 0.15) });
  page.drawText("VANTAGE", { x: 40, y: 800, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Integrated Trade & Logistics Platform", {
    x: 40,
    y: 784,
    size: 9,
    font,
    color: rgb(0.7, 0.78, 1),
  });

  let y = 740;
  page.drawText(doc.title, { x: 40, y, size: 16, font: bold, color: rgb(0.06, 0.09, 0.15) });
  y -= 18;
  if (doc.subtitle) {
    page.drawText(doc.subtitle, { x: 40, y, size: 10, font, color: rgb(0.43, 0.47, 0.55) });
    y -= 14;
  }
  if (doc.reference) {
    page.drawText(`Ref: ${doc.reference}`, { x: 40, y, size: 9, font, color: rgb(0.18, 0.42, 1) });
    y -= 22;
  }
  for (const f of doc.fields ?? []) {
    page.drawText(`${f.label}:`, { x: 40, y, size: 10, font: bold, color: rgb(0.35, 0.39, 0.47) });
    page.drawText(String(f.value ?? "—"), {
      x: 200,
      y,
      size: 10,
      font,
      color: rgb(0.06, 0.09, 0.15),
    });
    y -= 18;
  }
  page.drawText(doc.footer ?? `Generated ${new Date().toISOString()}`, {
    x: 40,
    y: 30,
    size: 8,
    font,
    color: rgb(0.6, 0.63, 0.69),
  });
  return await pdf.save();
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const userId = await callerFromAuthHeader(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const { doc, path } = await req.json();
    if (!doc?.title || !path) return json({ error: "doc.title and path required" }, 400);

    const bytes = await buildPdf(doc as RenderDoc);
    const db = adminClient();
    const { error } = await db.storage
      .from("transaction-docs")
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (error) return json({ error: error.message }, 400);

    const { data: signed } = await db.storage
      .from("transaction-docs")
      .createSignedUrl(path, 60 * 60);
    return json({ path, url: signed?.signedUrl ?? null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500);
  }
});
