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

  for r in
    select * from (values
      ('Maersk SA Forwarding', 'Cape Town', '2015/882341/07', '4123456789', array['Freight Forwarding', 'Ocean Transport']),
      ('Bidvest Panalpina', 'Johannesburg', '2012/441209/07', '4988123456', array['Freight Forwarding', 'Customs Clearing']),
      ('Imperial Logistics', 'Durban', '2010/339871/07', '4877654321', array['Transport', 'Warehousing', 'Distribution']),
      ('Grindrod Freight', 'Durban', '2008/229104/07', '4765432109', array['Freight Forwarding', 'Port Logistics'])
    ) as t(pname, pcity, preg, pvat, pservices)
  loop
    if not exists (select 1 from companies where name = r.pname) then
      insert into companies (name, type, registration_number, vat_number, country, city, service_categories, approval_status, approved_at)
      values (r.pname, 'source', r.preg, r.pvat, 'South Africa', r.pcity, r.pservices, 'approved', now());
    else
      update companies set
        type = 'source', registration_number = r.preg, vat_number = r.pvat, city = r.pcity,
        service_categories = r.pservices, approval_status = 'approved', approved_at = coalesce(approved_at, now()), updated_at = now()
      where name = r.pname;
    end if;
  end loop;

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
      ('company_registration'), ('tax_clearance'), ('bank_confirmation'),
      ('director_id'), ('sars_registration'), ('insurance'),
      ('operating_license'), ('bbbee_certificate')
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

-- ============================================================================
-- Phase 3 — bulk demo parity (TXN-1006..1125 + docs + 12-month spread).
-- Mirrors src/data/demoDataset.ts. Idempotent — safe to re-run.
-- ============================================================================
do $$
declare
  v_ubuntu uuid;
  v_sc uuid;
  v_buyer uuid;
  n integer;
  ref text;
  v_ship uuid;
  v_step integer;
  st public.shipment_status;
  statuses text[] := array[
    'draft','submitted','quoted','approved','in_progress','completed',
    'invoiced','paid','cancelled','disputed','archived'
  ];
  origins text[] := array[
    'Durban Port','Cape Town Port','Port Elizabeth','Durban Port',
    'Cape Town Port','Richards Bay','Durban Port','Cape Town Port',
    'Shanghai','Shenzhen','Mumbai','Singapore','Hamburg'
  ];
  dests text[] := array[
    'Johannesburg','Stellenbosch','Pretoria','Bloemfontein',
    'Johannesburg','Witbank','Polokwane','Kimberley',
    'Durban','Durban','Durban','Durban','Cape Town'
  ];
  cargos text[] := array[
    'Consumer Electronics','Textiles','Automotive Parts','FMCG Products',
    'Industrial Equipment','Containerised electronics','Refrigerated produce',
    'Bulk maize','Mining equipment','Wine pallets','Steel coils'
  ];
  doc_types text[] := array[
    'rfq','source_selection','formal_quote','purchase_order','proforma_invoice',
    'proof_of_service','tax_invoice','proof_of_payment','transaction_summary',
    'commercial_invoice','packing_list','import_permit','insurance_certificate'
  ];
  o text;
  d text;
  cargo text;
  freight numeric;
  customs numeric;
  wh numeric;
  tr numeric;
  vat numeric;
  qi integer;
  di integer;
  v_src uuid;
begin
  select id into v_ubuntu from public.companies where name = 'Ubuntu Retail Imports (Pty) Ltd';
  select id into v_sc from public.companies where name = 'Southern Cross Logistics Solutions';
  select id into v_buyer from auth.users where email = 'buyer@ubuntuimports.com';

  if v_ubuntu is null or v_sc is null or v_buyer is null then
    raise notice 'Phase-3 seed skipped — Phase-1 companies/users missing.';
    return;
  end if;

  for n in 1006..1110 loop
    ref := 'TXN-' || n;
    o := origins[1 + ((n - 1006) % array_length(origins, 1))];
    d := dests[1 + ((n - 1006) % array_length(dests, 1))];
    cargo := cargos[1 + ((n - 1006) % array_length(cargos, 1))];
    st := 'in_progress';
    v_step := 4 + ((n - 1006) % 11);
    v_src := v_sc;

    insert into public.shipments (
      reference, demand_company_id, source_company_id, created_by,
      shipment_type, cargo_description, origin_port, destination_port,
      final_delivery_location, container_type, cargo_value, currency, status, current_step,
      created_at
    ) values (
      ref, v_ubuntu, v_src, v_buyer,
      'Import Container', cargo, o, d,
      d || ' DC', '40FT',
      (120000 + ((n - 1006) * 47000) % 3800000)::numeric(14,2),
      'ZAR', st, v_step,
      make_timestamptz(2026, 1 + ((n - 1001) % 12), 1 + ((n * 3) % 27), 10, 0, 0)
    )
    on conflict (reference) do update set
      demand_company_id = excluded.demand_company_id,
      source_company_id = excluded.source_company_id,
      cargo_description = excluded.cargo_description,
      origin_port = excluded.origin_port,
      destination_port = excluded.destination_port,
      status = excluded.status,
      current_step = excluded.current_step,
      created_at = excluded.created_at,
      updated_at = now()
    returning id into v_ship;

    if v_ship is null then
      select id into v_ship from public.shipments where reference = ref;
    end if;

    for qi in 0..2 loop
      freight := (95000 + ((n - 1006) % 17) * 8500 + qi * 4200)::numeric(14,2);
      customs := round(freight * 0.12, 2);
      wh := round(freight * 0.15, 2);
      tr := round(freight * 0.18, 2);
      vat := round((freight + customs + wh + tr) * 0.15, 2);

      insert into public.quotes (
        reference, shipment_id, source_company_id,
        freight_cost, customs_cost, warehouse_cost, transport_cost, other_cost, vat_amount,
        estimated_transit_days, cost_score, service_score, compliance_score, capacity_score,
        risk_score, total_score, status
      ) values (
        'QTE-' || n || '-' || qi, v_ship, v_sc,
        freight, customs, wh, tr, 0, vat,
        5 + qi + ((n - 1006) % 8),
        25, 25, 20, 15, 15, 90 + qi,
        case when qi = 0 and v_step >= 4 then 'selected'::quote_status else 'submitted'::quote_status end
      )
      on conflict (reference) do update set
        shipment_id = excluded.shipment_id,
        freight_cost = excluded.freight_cost,
        status = excluded.status;
    end loop;
  end loop;

  for n in 1111..1125 loop
    ref := 'TXN-' || n;
    o := origins[1 + ((n - 1006) % array_length(origins, 1))];
    d := dests[1 + ((n - 1006) % array_length(dests, 1))];
    cargo := cargos[1 + ((n - 1006) % array_length(cargos, 1))];
    st := statuses[1 + ((n - 1111) % array_length(statuses, 1))]::public.shipment_status;
    v_step := case st
      when 'draft' then 1 when 'submitted' then 2 when 'quoted' then 3 when 'approved' then 4
      when 'in_progress' then 8 when 'completed' then 16 when 'invoiced' then 14 when 'paid' then 15
      when 'cancelled' then 6 when 'disputed' then 9 when 'archived' then 16 else 4 end;
    v_src := case when st in ('draft','submitted','quoted') then null else v_sc end;

    insert into public.shipments (
      reference, demand_company_id, source_company_id, created_by,
      shipment_type, cargo_description, origin_port, destination_port,
      final_delivery_location, container_type, cargo_value, currency, status, current_step,
      created_at
    ) values (
      ref, v_ubuntu, v_src, v_buyer,
      'Import Container', cargo, o, d,
      d || ' DC', '40FT',
      (120000 + ((n - 1006) * 47000) % 3800000)::numeric(14,2),
      'ZAR', st, v_step,
      make_timestamptz(2026, 1 + ((n - 1001) % 12), 1 + ((n * 3) % 27), 10, 0, 0)
    )
    on conflict (reference) do update set
      status = excluded.status,
      current_step = excluded.current_step,
      source_company_id = excluded.source_company_id,
      created_at = excluded.created_at,
      updated_at = now()
    returning id into v_ship;

    if v_ship is null then
      select id into v_ship from public.shipments where reference = ref;
    end if;

    for qi in 0..2 loop
      freight := (95000 + ((n - 1006) % 17) * 8500 + qi * 4200)::numeric(14,2);
      customs := round(freight * 0.12, 2);
      wh := round(freight * 0.15, 2);
      tr := round(freight * 0.18, 2);
      vat := round((freight + customs + wh + tr) * 0.15, 2);
      insert into public.quotes (
        reference, shipment_id, source_company_id,
        freight_cost, customs_cost, warehouse_cost, transport_cost, other_cost, vat_amount,
        estimated_transit_days, cost_score, service_score, compliance_score, capacity_score,
        risk_score, total_score, status
      ) values (
        'QTE-' || n || '-' || qi, v_ship, v_sc,
        freight, customs, wh, tr, 0, vat,
        5 + qi, 25, 25, 20, 15, 15, 90 + qi,
        case when qi = 0 and v_step >= 4 then 'selected'::quote_status else 'submitted'::quote_status end
      )
      on conflict (reference) do update set status = excluded.status;
    end loop;
  end loop;

  -- Backfill created_at for workbook rows TXN-1001..1005 (12-month spread).
  for n in 1001..1005 loop
    update public.shipments
    set created_at = make_timestamptz(2026, 1 + ((n - 1001) % 12), 5, 10, 0, 0)
    where reference = 'TXN-' || n;
  end loop;

  insert into public.ref_sequences (prefix, last_value) values ('TXN', 1125)
  on conflict (prefix) do update set last_value = greatest(public.ref_sequences.last_value, 1125);
  insert into public.ref_sequences (prefix, last_value) values ('QTE', 1125)
  on conflict (prefix) do update set last_value = greatest(public.ref_sequences.last_value, 1125);

  if to_regclass('public.shipment_documents') is not null then
    for v_ship, v_step, ref in
      select s.id, s.current_step, s.reference
      from public.shipments s
      where s.reference ~ '^TXN-1[0-9]{3}$' and s.current_step >= 4
    loop
      for di in 1..array_length(doc_types, 1) loop
        if not exists (
          select 1 from public.shipment_documents
          where shipment_id = v_ship and doc_type = doc_types[di]::doc_type and reference = ref || '-D' || di
        ) then
          insert into public.shipment_documents (
            shipment_id, doc_type, reference, status, version, generated_by
          ) values (
            v_ship,
            doc_types[di]::doc_type,
            ref || '-D' || di,
            (case when di % 4 = 0 then 'approved' when di % 3 = 0 then 'uploaded' else 'submitted' end)::doc_status,
            1 + (di % 3),
            v_buyer
          );
        end if;
      end loop;
    end loop;
  end if;

  if to_regclass('public.notifications') is not null and v_buyer is not null then
    if not exists (select 1 from public.notifications where user_id = v_buyer and title = 'Demo dataset loaded') then
      insert into public.notifications (user_id, title, body, link) values
        (v_buyer, 'Demo dataset loaded', '125 TradeHub shipments are available in your workspace.', '/transactions'),
        (v_buyer, 'Quote received', 'Southern Cross quoted TXN-1002 — R128,800 all-in.', '/transactions'),
        (v_buyer, 'Customs inspection hold', 'SARS hold on TXN-1004 — documentation review required.', '/transactions'),
        (v_buyer, 'Payment verified', 'INV-5001 (R203,000) settled for TXN-1001.', '/payments'),
        (v_buyer, 'Shipment delivered', 'TXN-1003 completed — POD uploaded.', '/transactions');
    end if;
  end if;

  raise notice 'Phase-3 bulk seed complete (TXN-1006..1125, 12-month spread, docs).';
end $$;
