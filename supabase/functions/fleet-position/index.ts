// FleetTracker (real). Returns the latest position/ETA for a transport trip.
// Sources from the trips table (+ waypoint history), optionally enriched via
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
    // Latest position straight from the trips table.
    const { data: trip } = await db
      .from("trips")
      .select("id, reference, lat, lng, progress_pct, status, updated_at")
      .eq("reference", tripRef)
      .maybeSingle();
    if (!trip) return json(null);

    // Waypoint history for the route trace.
    const { data: waypoints } = await db
      .from("trip_waypoints")
      .select("seq, lat, lng, label, recorded_at")
      .eq("trip_id", trip.id)
      .order("seq");

    return json({
      tripRef,
      lat: trip.lat,
      lng: trip.lng,
      progressPct: trip.progress_pct ?? 0,
      status: trip.status,
      updatedAt: trip.updated_at,
      waypoints: waypoints ?? [],
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500);
  }
});
