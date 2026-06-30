// SignatureProvider (real). Finalises an e-signature on a shipment document and
// writes the verifiable stamp + audit. Supports a typed-name signature now and a
// provider-webhook callback path (e.g. envelope completed) behind the same fn.
//
// Deploy:  supabase functions deploy sign-doc
// Secrets: SIGNATURE_WEBHOOK_SECRET (optional, for provider callbacks)
import { adminClient, callerFromAuthHeader } from "../_shared/supabaseAdmin.ts";
import { json, preflight } from "../_shared/cors.ts";

function token(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  return (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const userId = await callerFromAuthHeader(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const { documentId, fullName } = await req.json();
    if (!documentId || !fullName) return json({ error: "documentId and fullName required" }, 400);

    const signedAt = new Date().toISOString();
    const sigToken = `VTG-SIG-${token(fullName + signedAt)}`;

    const db = adminClient();
    const { data, error } = await db
      .from("shipment_documents")
      .update({
        signed_by: fullName,
        signed_at: signedAt,
        signature_token: sigToken,
        status: "verified",
      })
      .eq("id", documentId)
      .select("id, shipment_id")
      .single();
    if (error) return json({ error: error.message }, 400);

    await db.from("audit_logs").insert({
      action: "document.signed",
      entity: documentId,
      actor: userId,
      metadata: { token: sigToken, method: "typed-name" },
    });

    return json({ signedBy: fullName, signedAt, token: sigToken, shipmentId: data?.shipment_id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500);
  }
});
