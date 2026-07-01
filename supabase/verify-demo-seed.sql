-- Post-seed verification for the TradeHub demo dataset.
-- Run: supabase db execute --file supabase/verify-demo-seed.sql

select 'auth_users' as check_name, count(*)::text as value
from auth.users
where email in (
  'admin@tradehub.com','auditor@pulse.com','buyer@ubuntuimports.com',
  'finance@ubuntuimports.com','provider@sclogistics.com','warehouse@sclogistics.com',
  'transport@sclogistics.com','customs@sclogistics.com'
)
union all
select 'shipments_total', count(*)::text
from public.shipments where reference ~ '^TXN-1[0-9]{3}$'
union all
select 'shipments_active', count(*)::text
from public.shipments
where reference ~ '^TXN-1[0-9]{3}$' and status not in ('completed','paid','archived','cancelled')
union all
select 'status_distinct', count(distinct status)::text
from public.shipments where reference ~ '^TXN-1[0-9]{3}$'
union all
select 'months_distinct', count(distinct to_char(created_at, 'YYYY-MM'))::text
from public.shipments where reference ~ '^TXN-1[0-9]{3}$'
union all
select 'shipment_documents', count(*)::text
from public.shipment_documents d
join public.shipments s on s.id = d.shipment_id
where s.reference ~ '^TXN-1[0-9]{3}$'
union all
select 'quotes_total', count(*)::text
from public.quotes q
join public.shipments s on s.id = q.shipment_id
where s.reference ~ '^TXN-1[0-9]{3}$';
