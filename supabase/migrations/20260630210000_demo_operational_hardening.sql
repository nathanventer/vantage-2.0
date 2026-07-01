-- Demo operational hardening: remove stray auth users (keep exactly 8 canonical demo accounts).
-- Idempotent — safe to re-run.

begin;

do $$
declare
  v_email text;
  v_uid uuid;
  canonical text[] := array[
    'admin@tradehub.com',
    'auditor@pulse.com',
    'buyer@ubuntuimports.com',
    'finance@ubuntuimports.com',
    'provider@sclogistics.com',
    'warehouse@sclogistics.com',
    'transport@sclogistics.com',
    'customs@sclogistics.com'
  ];
begin
  for v_uid in
    select id from auth.users
    where email is null or not (email = any (canonical))
  loop
    delete from auth.identities where user_id = v_uid;
    delete from public.profiles where id = v_uid;
    delete from auth.users where id = v_uid;
  end loop;

  foreach v_email in array canonical loop
    update auth.users
    set
      encrypted_password = extensions.crypt('Demo@123', extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now())
    where email = v_email;
  end loop;
end $$;

commit;

-- Rollback (manual): re-create any removed test users via seed.sql.
