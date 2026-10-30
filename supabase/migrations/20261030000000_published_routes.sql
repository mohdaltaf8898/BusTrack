-- Preserve unknown pickup locations and the provenance of the historical timetable.
-- Run after 20261027000000_init.sql. Do not mark an inferred route as verified.

alter table public.routes
  add column if not exists geometry_source text not null default 'straight'
    check (geometry_source in ('straight', 'road', 'verified')),
  add column if not exists schedule_year text,
  add column if not exists scheduled_duration_minutes integer
    check (scheduled_duration_minutes is null or scheduled_duration_minutes between 1 and 300);

alter table public.stops
  alter column latitude drop not null,
  alter column longitude drop not null,
  add column if not exists scheduled_time time,
  add column if not exists location_source text,
  add column if not exists location_reference text,
  add column if not exists note text;

-- A stop is either located or explicitly unmapped; never interpret null as 0,0.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stops'::regclass and conname = 'stops_coordinate_pair'
  ) then
    alter table public.stops add constraint stops_coordinate_pair
      check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null));
  end if;
end $$;

alter table public.buses
  alter column capacity drop not null,
  alter column capacity drop default;

-- Allow the trusted database owner/SQL editor to bootstrap the very first
-- administrator. PostgREST sessions (session_user = authenticator) and normal
-- authenticated users still cannot promote themselves.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role
     and coalesce(public.current_user_role(), 'student') <> 'admin'
     and not (
       auth.uid() is null
       and session_user in ('postgres', 'supabase_admin')
       and current_setting('role') in ('none', 'postgres', 'supabase_admin')
     ) then
    raise exception 'Only an administrator or trusted database owner can change profile roles.';
  end if;
  return new;
end;
$$;

-- A change to stop positions/order invalidates a previously verified corridor.
-- The operator must supply and verify a new shape before GPS is accepted again.
create or replace function public.invalidate_route_geometry_after_stop_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and old.route_id is not distinct from new.route_id
     and old.latitude is not distinct from new.latitude
     and old.longitude is not distinct from new.longitude
     and old.stop_order is not distinct from new.stop_order then
    return new;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    update public.routes set geometry_source = 'straight' where id = old.route_id;
  end if;
  if tg_op in ('UPDATE', 'INSERT') then
    update public.routes set geometry_source = 'straight' where id = new.route_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists invalidate_route_geometry_after_stop_change on public.stops;
create trigger invalidate_route_geometry_after_stop_change
  after insert or update or delete on public.stops
  for each row execute function public.invalidate_route_geometry_after_stop_change();

-- The older RPC checks only a bounding box. Route all GPS writes through the
-- authenticated server endpoint instead, which requires a verified corridor
-- and enforces the tighter 800 m distance check. Direct table writes stay denied.
revoke all on function public.submit_bus_location(uuid, double precision, double precision, numeric, numeric, numeric, timestamptz)
  from public, anon, authenticated;
