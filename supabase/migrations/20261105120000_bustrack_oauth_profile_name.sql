-- Google (and other OAuth) accounts arrive with `full_name` / `name` in
-- raw_user_meta_data rather than the `name` key used by the email sign-up form.
-- Without this, an OAuth profile falls back to the local part of the email.
-- The role stays hard-coded to 'student': signing up never grants driver or
-- admin access.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'nickname', ''),
      split_part(coalesce(new.email, 'user'), '@', 1),
      'BusTrack user'
    ),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Existing OAuth profiles that only got an email prefix keep it; only fill in a
-- display name when the profile is still the derived placeholder and the auth
-- record carries a real name.
update public.profiles p
set name = coalesce(
  nullif(u.raw_user_meta_data ->> 'full_name', ''),
  nullif(u.raw_user_meta_data ->> 'name', ''),
  p.name
)
from auth.users u
where u.id = p.id
  and p.name = split_part(coalesce(u.email, 'user'), '@', 1)
  and coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), nullif(u.raw_user_meta_data ->> 'name', '')) is not null;
