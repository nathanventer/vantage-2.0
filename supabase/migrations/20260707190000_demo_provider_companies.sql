-- Demo source providers for multi-quote Optimizer matching (idempotent).
begin;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      (
        'Maersk SA Forwarding',
        'Cape Town',
        '2015/882341/07',
        '4123456789',
        array['Freight Forwarding', 'Ocean Transport']
      ),
      (
        'Bidvest Panalpina',
        'Johannesburg',
        '2012/441209/07',
        '4988123456',
        array['Freight Forwarding', 'Customs Clearing']
      ),
      (
        'Imperial Logistics',
        'Durban',
        '2010/339871/07',
        '4877654321',
        array['Transport', 'Warehousing', 'Distribution']
      ),
      (
        'Grindrod Freight',
        'Durban',
        '2008/229104/07',
        '4765432109',
        array['Freight Forwarding', 'Port Logistics']
      )
    ) as t(name, city, reg_no, vat_no, services)
  loop
    if not exists (select 1 from public.companies c where c.name = r.name) then
      insert into public.companies (
        name, type, registration_number, vat_number, country, city,
        service_categories, approval_status, approved_at
      ) values (
        r.name, 'source', r.reg_no, r.vat_no, 'South Africa', r.city,
        r.services, 'approved', now()
      );
    else
      update public.companies set
        type = 'source',
        registration_number = r.reg_no,
        vat_number = r.vat_no,
        city = r.city,
        service_categories = r.services,
        approval_status = 'approved',
        approved_at = coalesce(approved_at, now()),
        updated_at = now()
      where name = r.name;
    end if;
  end loop;
end $$;

commit;
