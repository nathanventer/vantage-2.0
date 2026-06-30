-- ============================================================================
-- Vantage Phase 1 — TradeHub + Pulse demo dataset
-- Source files: TradeHub_Pulse_Demo_Workbook.xlsx + DEMO TradeHub Demo
--               Participants for Pulse Reporting.docx
-- Idempotent: safe to re-run. Assumes the canonical schema (8 tables / 9 enums)
-- already exists, plus the two RLS-fix migrations in ./migrations.
-- All demo logins use password: Demo@123
-- ============================================================================

do $$
declare
  v_ubuntu uuid;
  v_sc uuid;
  v_uid uuid;
  v_buyer uuid;
  r record;
begin
  --------------------------------------------------------------------------
  -- 1. Companies — Demand (Ubuntu) + Source (Southern Cross). Upsert by name.
  --------------------------------------------------------------------------
  select id into v_ubuntu from companies where name = 'Ubuntu Retail Imports (Pty) Ltd';
  if v_ubuntu is null then
    insert into companies (name, type) values ('Ubuntu Retail Imports (Pty) Ltd', 'demand')
    returning id into v_ubuntu;
  end if;
  update companies set
    type = 'demand', registration_number = '2023/458921/07', vat_number = '4980276543',
    sars_customs_code = 'SA-CUST-45892', country = 'South Africa', city = 'Johannesburg',
    contact_person = 'Michael Dlamini', contact_email = 'michael.dlamini@ubunturetail.co.za',
    contact_phone = '+27 11 555 7845',
    service_categories = array['Retail Distribution', 'Importing'],
    approval_status = 'approved', approved_at = now(), updated_at = now()
  where id = v_ubuntu;

  select id into v_sc from companies where name = 'Southern Cross Logistics Solutions';
  if v_sc is null then
    insert into companies (name, type) values ('Southern Cross Logistics Solutions', 'source')
    returning id into v_sc;
  end if;
  update companies set
    type = 'source', registration_number = '2019/774563/07', vat_number = '4210987345',
    sars_clearing_code = 'SARS-CLR-8845', country = 'South Africa', city = 'Durban',
    contact_person = 'Sarah Naidoo', contact_email = 'sarah.naidoo@sclogistics.co.za',
    contact_phone = '+27 31 555 6677', fleet_size = 35, warehouse_capacity_sqm = 12000,
    service_categories = array['Freight Forwarding', 'Customs Clearing', 'Warehousing', 'Transport'],
    approval_status = 'approved', approved_at = now(), updated_at = now()
  where id = v_sc;

  --------------------------------------------------------------------------
  -- 2. Demo users (auth.users + identities + profiles). Password Demo@123.
  --    Token columns set to '' so GoTrue can authenticate SQL-seeded users.
  --------------------------------------------------------------------------
  for r in
    select * from (values
      ('admin@tradehub.com',        'Platform Admin',           'super_admin',      null::uuid),
      ('auditor@pulse.com',         'Pulse Auditor',            'compliance_admin', null::uuid),
      ('buyer@ubuntuimports.com',   'Michael Dlamini',          'demand_user',      v_ubuntu),
      ('finance@ubuntuimports.com', 'Ubuntu Finance',          'demand_user',      v_ubuntu),
      ('provider@sclogistics.com',  'Sarah Naidoo',            'source_user',      v_sc),
      ('warehouse@sclogistics.com', 'SC Warehouse Manager',    'source_user',      v_sc),
      ('transport@sclogistics.com', 'SC Transport Coordinator','source_user',      v_sc),
      ('customs@sclogistics.com',   'SC Customs Agent',        'source_user',      v_sc)
    ) as t(email, full_name, role, company_id)
  loop
    select id into v_uid from auth.users where email = r.email;
    if v_uid is null then
      v_uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
        confirmation_token, email_change, email_change_token_new, recovery_token,
        email_change_token_current, phone_change, phone_change_token, reauthentication_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
        r.email, extensions.crypt('Demo@123', extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', r.full_name),
        '', '', '', '', '', '', '', ''
      );
      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (v_uid::text, v_uid, jsonb_build_object('sub', v_uid::text, 'email', r.email), 'email', now(), now(), now());
    else
      update auth.users set
        encrypted_password = extensions.crypt('Demo@123', extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        confirmation_token = coalesce(confirmation_token, ''),
        email_change = coalesce(email_change, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        recovery_token = coalesce(recovery_token, ''),
        email_change_token_current = coalesce(email_change_token_current, ''),
        phone_change = coalesce(phone_change, ''),
        phone_change_token = coalesce(phone_change_token, ''),
        reauthentication_token = coalesce(reauthentication_token, '')
      where id = v_uid;
    end if;

    insert into profiles (id, email, full_name, role, company_id, status, onboarding_step)
    values (v_uid, r.email, r.full_name, r.role::user_role, r.company_id, 'active', 8)
    on conflict (id) do update set
      email = excluded.email, full_name = excluded.full_name, role = excluded.role,
      company_id = excluded.company_id, status = 'active', onboarding_step = 8, updated_at = now();
  end loop;

  select id into v_buyer from profiles where email = 'buyer@ubuntuimports.com';

  --------------------------------------------------------------------------
  -- 3. Shipments (TXN-1001..1005) — workbook transaction data. Upsert by ref.
  --------------------------------------------------------------------------
  for r in
    select * from (values
      ('TXN-1001','Import Container','Consumer Electronics','Shanghai','Durban','Johannesburg DC Warehouse','40FT',185000,'in_progress',11),
      ('TXN-1002','Import Container','Textiles',           'Shenzhen','Durban','Johannesburg DC',        '20FT', 98000,'in_progress', 9),
      ('TXN-1003','Import Container','Automotive Parts',   'Mumbai',  'Durban','Pretoria DC',            '40FT',220000,'completed',  13),
      ('TXN-1004','Import Container','FMCG Products',       'Singapore','Durban','Johannesburg DC',       '40FT',145000,'in_progress',10),
      ('TXN-1005','Import Container','Industrial Equipment','Hamburg','Cape Town','Cape Town DC',         '40FT',320000,'completed',  13)
    ) as t(ref, stype, cargo, origin, dest, final, ctype, val, status, step)
  loop
    insert into shipments (reference, demand_company_id, source_company_id, created_by,
      shipment_type, cargo_description, origin_port, destination_port, final_delivery_location,
      container_type, cargo_value, currency, status, current_step)
    values (r.ref, v_ubuntu, v_sc, v_buyer, r.stype, r.cargo, r.origin, r.dest, r.final,
      r.ctype, r.val, 'ZAR', r.status::shipment_status, r.step)
    on conflict (reference) do update set
      demand_company_id = excluded.demand_company_id, source_company_id = excluded.source_company_id,
      created_by = excluded.created_by, shipment_type = excluded.shipment_type,
      cargo_description = excluded.cargo_description, origin_port = excluded.origin_port,
      destination_port = excluded.destination_port, final_delivery_location = excluded.final_delivery_location,
      container_type = excluded.container_type, cargo_value = excluded.cargo_value,
      status = excluded.status, current_step = excluded.current_step, updated_at = now();
  end loop;

  --------------------------------------------------------------------------
  -- 4. Quotes (one per shipment) — workbook costs + 15% VAT + source scoring.
  --------------------------------------------------------------------------
  for r in
    select s.id as shipment_id, x.qref, x.freight, x.warehouse, x.transport, x.customs, x.transit
    from shipments s
    join (values
      ('TXN-1001','QTE-0001',145000,22000,36000,18500, 5),
      ('TXN-1002','QTE-0002', 92000,15000,21000, 9000, 2),
      ('TXN-1003','QTE-0003',170000,28000,45000,17000, 8),
      ('TXN-1004','QTE-0004',132000,20000,30000,12000, 6),
      ('TXN-1005','QTE-0005',240000,35000,65000,24000,12)
    ) as x(ref, qref, freight, warehouse, transport, customs, transit) on x.ref = s.reference
  loop
    insert into quotes (reference, shipment_id, source_company_id,
      freight_cost, customs_cost, warehouse_cost, transport_cost, other_cost, vat_amount,
      estimated_transit_days, cost_score, service_score, compliance_score, capacity_score, risk_score, total_score, status)
    values (r.qref, r.shipment_id, v_sc, r.freight, r.customs, r.warehouse, r.transport, 0,
      round((r.freight + r.customs + r.warehouse + r.transport) * 0.15, 2),
      r.transit, 23, 24, 19, 14, 14, 94, 'selected')
    on conflict (reference) do update set
      shipment_id = excluded.shipment_id, source_company_id = excluded.source_company_id,
      freight_cost = excluded.freight_cost, customs_cost = excluded.customs_cost,
      warehouse_cost = excluded.warehouse_cost, transport_cost = excluded.transport_cost,
      vat_amount = excluded.vat_amount, estimated_transit_days = excluded.estimated_transit_days,
      total_score = excluded.total_score, status = excluded.status;
  end loop;

  --------------------------------------------------------------------------
  -- 5. Compliance documents (verified) for both companies.
  --------------------------------------------------------------------------
  for r in
    select c.cid, d.dt
    from (values (v_ubuntu), (v_sc)) c(cid)
    cross join (values
      ('company_registration'), ('tax_clearance'), ('vat_certificate'),
      ('bank_confirmation'), ('sars_registration')
    ) d(dt)
  loop
    if not exists (
      select 1 from compliance_documents where company_id = r.cid and doc_type = r.dt::compliance_doc_type
    ) then
      insert into compliance_documents (company_id, doc_type, verification_status, verified_at)
      values (r.cid, r.dt::compliance_doc_type, 'verified', now());
    end if;
  end loop;
end $$;

-- ============================================================================
-- Phase 2 demo data — Pulse rate intelligence + an active subscriber + ops
-- events. Guarded so every block is safe to re-run. Skipped automatically if a
-- Phase-2 table is absent (i.e. migrations not yet applied).
-- ============================================================================
do $$
declare
  v_sc uuid;
  v_buyer uuid;
  v_card uuid;
  v_txn uuid;
  v_sys uuid;
  r record;
  p text;
  base numeric;
begin
  if to_regclass('public.lane_rates') is null then
    raise notice 'Phase-2 tables not present; skipping Phase-2 seed.';
    return;
  end if;

  select id into v_sc from public.companies where name = 'Southern Cross Logistics Solutions';
  select id into v_buyer from auth.users where email = 'buyer@ubuntuimports.com';
  select id into v_sys from auth.users where email = 'admin@tradehub.com';

  --------------------------------------------------------------------------
  -- Rate card + lane rates: 4 lanes × 2 modes × last 12 months, with a gentle
  -- upward trend + deterministic wobble so benchmarks/trends look real.
  --------------------------------------------------------------------------
  select id into v_card from public.rate_cards
    where provider_company_id = v_sc and name = 'Southern Cross 2026 Lane Card';
  if v_card is null then
    insert into public.rate_cards (provider_company_id, name, currency, valid_from, valid_to)
    values (v_sc, 'Southern Cross 2026 Lane Card', 'ZAR', date '2025-07-01', date '2026-12-31')
    returning id into v_card;
  end if;

  for r in
    select * from (values
      ('Durban Port','Johannesburg','Sea', 95000),
      ('Durban Port','Johannesburg','Road', 78000),
      ('Cape Town Port','Johannesburg','Sea', 188000),
      ('Cape Town Port','Stellenbosch','Road', 86000),
      ('Durban Port','Bloemfontein','Sea', 176000),
      ('Port Elizabeth','Pretoria','Sea', 165000)
    ) as t(origin, destination, mode, base)
  loop
    for i in 0..11 loop
      p := to_char((date_trunc('month', now()) - (i || ' months')::interval), 'YYYY-MM');
      -- trend: older months cheaper; wobble: deterministic per month index
      base := r.base * (1 + (11 - i) * 0.008) * (1 + ((i % 3) - 1) * 0.01);
      if not exists (
        select 1 from public.lane_rates
        where rate_card_id = v_card and origin = r.origin and destination = r.destination
          and mode = r.mode and period = p
      ) then
        insert into public.lane_rates (rate_card_id, provider_company_id, provider_name,
          origin, destination, mode, period, price, currency, transit_days)
        values (v_card, v_sc, 'Southern Cross Logistics Solutions',
          r.origin, r.destination, r.mode, p, round(base, 2), 'ZAR',
          case r.mode when 'Sea' then 18 when 'Rail' then 9 else 4 end);
      end if;
    end loop;
  end loop;

  --------------------------------------------------------------------------
  -- An active Pulse subscriber (the demand buyer) for entitlement demos.
  --------------------------------------------------------------------------
  if v_buyer is not null and not exists (
    select 1 from public.rate_subscriptions where user_id = v_buyer
  ) then
    insert into public.rate_subscriptions (user_id, plan, status, current_period_end)
    values (v_buyer, 'standard', 'active', now() + interval '30 days');
  end if;

  --------------------------------------------------------------------------
  -- Sample ops events on TXN-1003 (idempotent by step).
  --------------------------------------------------------------------------
  if to_regclass('public.shipment_events') is not null then
    select id into v_txn from public.shipments where reference = 'TXN-1003';
    if v_txn is not null then
      for r in
        select * from (values
          (1, 'milestone', 'Shipment request created'),
          (2, 'milestone', 'Providers matched'),
          (3, 'milestone', 'Quotes received and accepted'),
          (4, 'milestone', 'Provider confirmed')
        ) as t(step, etype, note)
      loop
        if not exists (
          select 1 from public.shipment_events where shipment_id = v_txn and step = r.step
        ) then
          insert into public.shipment_events (shipment_id, event_type, step, note, created_by)
          values (v_txn, r.etype, r.step, r.note, v_sys);
        end if;
      end loop;
    end if;
  end if;
end $$;
