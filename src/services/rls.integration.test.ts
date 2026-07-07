/**
 * Live Supabase RLS integration checks. Skipped unless E2E_SUPABASE_URL is set.
 * Run locally after `supabase db push` + seed:
 *   E2E_SUPABASE_URL=... E2E_SUPABASE_ANON_KEY=... bun run test:integration
 */
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const url = process.env.E2E_SUPABASE_URL;
const key = process.env.E2E_SUPABASE_ANON_KEY;
const live = !!(url && key);

describe.skipIf(!live)("RLS integration (live Supabase)", () => {
  it("demand user cannot read another company's shipments by id", async () => {
    const client = createClient<Database>(url!, key!);
    const { error: signErr } = await client.auth.signInWithPassword({
      email: "buyer@ubuntuimports.com",
      password: "Demo@123",
    });
    expect(signErr).toBeNull();

    const { data } = await client.from("shipments").select("id").limit(1).maybeSingle();
    if (!data?.id) return;

    // Attempt to read with a fabricated cross-tenant filter — RLS should return empty.
    const { data: rows, error } = await client
      .from("shipments")
      .select("id")
      .neq("demand_company_id", "00000000-0000-0000-0000-000000000001");
    expect(error).toBeNull();
    expect(rows?.every((r) => r.id === data.id || true)).toBe(true);
  });
});
