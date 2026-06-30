// FleetTracker (real). Returns the latest position/ETA for a transport trip.
// Sources from device pings recorded in shipment_events, optionally enriched via
// a maps provider (ETA/road distance). Maps key stays server-side.
//
// Deploy:  supabase functions deploy fleet-position
// Secrets: MAPS_API_KEY (e.g. Google Maps / Mapbox)
import { adminClient, callerFromAuthHeader } from "../_shared/supabaseAdmin.ts";
import { json, preflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const userId = await callerFromAuthHeader(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const { tripRef } = await req.json();
    if (!tripRef) return json({ error: "tripRef required" }, 400);

    const db = adminClient();
    // Latest GPS ping for this trip from the ops event stream.
    const { data: ping } = await db
      .from("shipment_events")
      .select("payload, created_at")
      .eq("trip_ref", tripRef)
      .eq("event_type", "gps_ping")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ping) return json(null);

    const p = ping.payload as { lat: number; lng: number; progressPct?: number };
    // TODO: enrich ETA via MAPS_API_KEY when distance/traffic data is needed.
    return json({
      tripRef,
      lat: p.lat,
      lng: p.lng,
      progressPct: p.progressPct ?? 0,
      updatedAt: ping.created_at,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500);
  }
});
