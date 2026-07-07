-- handle_new_user inserted into an unqualified `profiles`; under GoTrue's
-- restricted search_path that resolves to "relation profiles does not exist",
-- which failed every real sign-up (auth.signUp -> 500). Pin search_path to ''
-- and fully-qualify the table so the trigger works from any caller.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;
