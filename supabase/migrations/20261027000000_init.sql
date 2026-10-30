-- BusTrack · Smart College Bus Tracking System
-- Initial PostgreSQL / Supabase schema, constraints, RLS and secure RPCs.
-- Apply with the Supabase SQL editor or `supabase db push`, then run supabase/seed.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  role text not null default 'student' check (role in ('student', 'driver', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The profiles table must exist before PostgreSQL validates this SQL function.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;


create table if not exists public.routes (
  id text primary key,
  code text not null unique,
  route_name text not null check (char_length(route_name) between 3 and 120),
  start_location text not null,
  destination text not null,
  bus_number text,
  description text not null default '',
  average_speed_kmh numeric(5,2) not null default 26 check (average_speed_kmh between 5 and 80),
  estimated_duration_minutes integer not null default 45 check (estimated_duration_minutes between 5 and 300),
  status text not null default 'scheduled' check (status in ('active', 'scheduled', 'maintenance')),
  color text not null default '#2563eb',
  shape jsonb not null default '[]'::jsonb check (jsonb_typeof(shape) = 'array'),
  stop_indices jsonb not null default '[]'::jsonb check (jsonb_typeof(stop_indices) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.buses (
  id text primary key,
  bus_number text not null unique check (char_length(bus_number) between 2 and 30),
  assigned_route_id text not null references public.routes(id) on delete restrict,
  driver_id uuid references public.profiles(id) on delete set null,
  capacity integer not null default 45 check (capacity between 1 and 120),
  status text not null default 'scheduled' check (status in ('active', 'scheduled', 'maintenance')),
  model text not null default 'College coach',
  service_availability text not null default 'Service hours to be configured',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stops (
  id text primary key,
  route_id text not null references public.routes(id) on delete cascade,
  stop_name text not null check (char_length(stop_name) between 2 and 120),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  stop_order integer not null check (stop_order between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  bus_id text not null references public.buses(id) on delete cascade,
  route_id text not null references public.routes(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  sharing_enabled boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_location_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_valid_time check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.bus_locations (
  id bigint generated always as identity primary key,
  bus_id text not null references public.buses(id) on delete cascade,
  route_id text not null references public.routes(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  heading numeric(6,2) check (heading is null or heading between 0 and 360),
  speed_kmh numeric(6,2) check (speed_kmh is null or speed_kmh between 0 and 160),
  accuracy_meters numeric(7,2) check (accuracy_meters is null or accuracy_meters between 0 and 1000),
  source text not null default 'gps' check (source in ('gps', 'simulation', 'manual')),
  status text not null default 'active' check (status in ('active', 'stale', 'last_known')),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  bus_id text references public.buses(id) on delete cascade,
  route_id text references public.routes(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 140),
  message text not null check (char_length(message) between 2 and 500),
  type text not null check (type in ('delay', 'approaching', 'arrival', 'trip_started', 'trip_completed', 'location_unavailable', 'system')),
  is_simulated boolean not null default true,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.notification_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create table if not exists public.delay_reports (
  id uuid primary key default gen_random_uuid(),
  bus_id text not null references public.buses(id) on delete cascade,
  route_id text not null references public.routes(id) on delete cascade,
  delay_seconds integer not null check (delay_seconds between 30 and 7200),
  reason text not null check (char_length(reason) between 3 and 180),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_buses_route on public.buses(assigned_route_id);
create index if not exists idx_buses_driver on public.buses(driver_id);
create index if not exists idx_stops_route_order on public.stops(route_id, stop_order);
create index if not exists idx_trips_bus_started on public.trips(bus_id, started_at desc);
create index if not exists idx_trips_route_status on public.trips(route_id, status);
create index if not exists idx_trips_driver_status on public.trips(driver_id, status);
create index if not exists idx_bus_locations_bus_recorded on public.bus_locations(bus_id, recorded_at desc);
create index if not exists idx_bus_locations_trip_recorded on public.bus_locations(trip_id, recorded_at desc);
create index if not exists idx_bus_locations_route_recorded on public.bus_locations(route_id, recorded_at desc);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_broadcast_created on public.notifications(created_at desc) where user_id is null;
create index if not exists idx_delay_reports_route_created on public.delay_reports(route_id, created_at desc);
create unique index if not exists one_active_trip_per_bus on public.trips(bus_id) where status = 'active';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
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
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, 'user'), '@', 1), 'BusTrack user'),
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

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and coalesce(public.current_user_role(), 'student') <> 'admin' then
    raise exception 'Only an administrator can change profile roles.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute function public.prevent_role_escalation();

create or replace function public.validate_driver_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.driver_id is not null and not exists (
    select 1 from public.profiles p where p.id = new.driver_id and p.role = 'driver'
  ) then
    raise exception 'driver_id must reference a profile with the driver role.';
  end if;
  return new;
end;
$$;

drop trigger if exists buses_validate_driver_assignment on public.buses;
create trigger buses_validate_driver_assignment
before insert or update of driver_id on public.buses
for each row execute function public.validate_driver_assignment();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists routes_set_updated_at on public.routes;
create trigger routes_set_updated_at before update on public.routes for each row execute function public.set_updated_at();
drop trigger if exists buses_set_updated_at on public.buses;
create trigger buses_set_updated_at before update on public.buses for each row execute function public.set_updated_at();
drop trigger if exists stops_set_updated_at on public.stops;
create trigger stops_set_updated_at before update on public.stops for each row execute function public.set_updated_at();
drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at before update on public.trips for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Location-update health view (uses caller RLS via security_invoker)
-- ---------------------------------------------------------------------------
create or replace view public.bus_location_health
with (security_invoker = true)
as
select
  b.id as bus_id,
  b.bus_number,
  b.assigned_route_id,
  loc.id as location_id,
  loc.latitude,
  loc.longitude,
  loc.recorded_at,
  loc.source,
  loc.status as location_status,
  coalesce(t.status, 'offline') as trip_status,
  coalesce(t.sharing_enabled, false) as sharing_enabled,
  case
    when loc.recorded_at is null then 'offline'
    when loc.recorded_at < now() - interval '45 seconds' then 'stale'
    else 'fresh'
  end as health,
  case
    when loc.recorded_at is null then null
    else floor(extract(epoch from (now() - loc.recorded_at)))::integer
  end as seconds_since_update
from public.buses b
left join lateral (
  select l.*
  from public.bus_locations l
  where l.bus_id = b.id
  order by l.recorded_at desc
  limit 1
) loc on true
left join public.trips t on t.id = loc.trip_id;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.routes enable row level security;
alter table public.stops enable row level security;
alter table public.buses enable row level security;
alter table public.trips enable row level security;
alter table public.bus_locations enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.delay_reports enable row level security;

drop policy if exists "Profiles are visible to self or admin" on public.profiles;
create policy "Profiles are visible to self or admin"
on public.profiles for select to authenticated
using (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "Users can update own profile, admins can manage profiles" on public.profiles;
create policy "Users can update own profile, admins can manage profiles"
on public.profiles for update to authenticated
using (id = auth.uid() or public.current_user_role() = 'admin')
with check (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "Routes are publicly readable" on public.routes;
create policy "Routes are publicly readable"
on public.routes for select to anon, authenticated using (true);
drop policy if exists "Stops are publicly readable" on public.stops;
create policy "Stops are publicly readable"
on public.stops for select to anon, authenticated using (true);
drop policy if exists "Buses are publicly readable" on public.buses;
create policy "Buses are publicly readable"
on public.buses for select to anon, authenticated using (true);

drop policy if exists "Only admins write routes" on public.routes;
create policy "Only admins write routes"
on public.routes for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
drop policy if exists "Only admins write stops" on public.stops;
create policy "Only admins write stops"
on public.stops for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
drop policy if exists "Only admins write buses" on public.buses;
create policy "Only admins write buses"
on public.buses for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Authenticated users can read trip state" on public.trips;
create policy "Authenticated users can read trip state"
on public.trips for select to authenticated using (true);

-- No direct INSERT/UPDATE/DELETE policy on trips: writes use validated API/RPC.
drop policy if exists "Read shared bus locations only" on public.bus_locations;
create policy "Read shared bus locations only"
on public.bus_locations for select to authenticated
using (
  public.current_user_role() = 'admin'
  or exists (
    select 1
    from public.trips t
    where t.id = bus_locations.trip_id
      and t.bus_id = bus_locations.bus_id
      and t.driver_id = auth.uid()
  )
  or (
    bus_locations.recorded_at > now() - interval '15 minutes'
    and exists (
      select 1
      from public.trips t
      where t.id = bus_locations.trip_id
        and t.bus_id = bus_locations.bus_id
        and t.status = 'active'
    )
  )
  or (
    bus_locations.recorded_at > now() - interval '15 minutes'
    and exists (
      select 1
      from public.trips t
      where t.id = bus_locations.trip_id
        and t.status = 'completed'
        and t.ended_at > now() - interval '15 minutes'
    )
  )
);

-- No direct write policy on bus_locations: writes use validated API/RPC.
drop policy if exists "Read own or broadcast notifications" on public.notifications;
create policy "Read own or broadcast notifications"
on public.notifications for select to authenticated
using (
  user_id is null
  or user_id = auth.uid()
  or public.current_user_role() = 'admin'
);
drop policy if exists "Users mark direct notifications read" on public.notifications;
create policy "Users mark direct notifications read"
on public.notifications for update to authenticated
using (user_id = auth.uid() or public.current_user_role() = 'admin')
with check (user_id = auth.uid() or public.current_user_role() = 'admin');
drop policy if exists "Admins create notifications" on public.notifications;
create policy "Admins create notifications"
on public.notifications for insert to authenticated
with check (public.current_user_role() = 'admin');
drop policy if exists "Admins delete notifications" on public.notifications;
create policy "Admins delete notifications"
on public.notifications for delete to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "Users read own notification reads" on public.notification_reads;
create policy "Users read own notification reads"
on public.notification_reads for select to authenticated
using (user_id = auth.uid() or public.current_user_role() = 'admin');
drop policy if exists "Users insert own notification reads" on public.notification_reads;
create policy "Users insert own notification reads"
on public.notification_reads for insert to authenticated
with check (user_id = auth.uid());
drop policy if exists "Users update own notification reads" on public.notification_reads;
create policy "Users update own notification reads"
on public.notification_reads for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Delay reports are readable" on public.delay_reports;
create policy "Delay reports are readable"
on public.delay_reports for select to authenticated using (true);
drop policy if exists "Only admins write delay reports" on public.delay_reports;
create policy "Only admins write delay reports"
on public.delay_reports for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

revoke insert, update, delete on public.trips from anon, authenticated;
revoke insert, update, delete on public.bus_locations from anon, authenticated;
grant select on public.bus_location_health to authenticated;

-- ---------------------------------------------------------------------------
-- Secure RPCs for driver devices (defense in depth alongside API routes)
-- ---------------------------------------------------------------------------
create or replace function public.submit_bus_location(
  p_trip_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_heading numeric default null,
  p_speed_kmh numeric default null,
  p_accuracy_meters numeric default null,
  p_recorded_at timestamptz default now()
)
returns public.bus_locations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_trip public.trips%rowtype;
  v_bus public.buses%rowtype;
  v_result public.bus_locations%rowtype;
  v_min_lat double precision;
  v_max_lat double precision;
  v_min_lng double precision;
  v_max_lng double precision;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  select role into v_role from public.profiles where id = auth.uid();
  if coalesce(v_role, '') not in ('driver', 'admin') then
    raise exception 'Only authorized drivers or administrators can submit GPS.';
  end if;
  if p_latitude not between 17.15 and 17.7 or p_longitude not between 78.1 and 78.8 then
    raise exception 'Coordinates are outside the configured Hyderabad service area.';
  end if;
  if p_recorded_at > now() + interval '15 seconds' or p_recorded_at < now() - interval '60 seconds' then
    raise exception 'Location timestamp is stale or too far in the future.';
  end if;
  if p_heading is not null and p_heading not between 0 and 360 then
    raise exception 'Heading is invalid.';
  end if;
  if p_speed_kmh is not null and p_speed_kmh not between 0 and 160 then
    raise exception 'Speed is invalid.';
  end if;
  if p_accuracy_meters is not null and p_accuracy_meters not between 0 and 1000 then
    raise exception 'Accuracy is invalid.';
  end if;

  select * into v_trip from public.trips where id = p_trip_id;
  if not found or v_trip.status <> 'active' or not v_trip.sharing_enabled then
    raise exception 'GPS is accepted only during an active trip with sharing enabled.';
  end if;
  select * into v_bus from public.buses where id = v_trip.bus_id;
  if not found or v_bus.assigned_route_id is distinct from v_trip.route_id then
    raise exception 'Bus and trip route assignments do not match.';
  end if;
  if v_role = 'driver' and (v_bus.driver_id is distinct from auth.uid() or v_trip.driver_id is distinct from auth.uid()) then
    raise exception 'This driver is not assigned to this trip.';
  end if;

  select
    min((point.value ->> 'lat')::double precision),
    max((point.value ->> 'lat')::double precision),
    min((point.value ->> 'lng')::double precision),
    max((point.value ->> 'lng')::double precision)
  into v_min_lat, v_max_lat, v_min_lng, v_max_lng
  from public.routes r
  cross join lateral jsonb_array_elements(r.shape) as point(value)
  where r.id = v_trip.route_id;
  if v_min_lat is null then
    raise exception 'The trip route has no usable geometry.';
  end if;
  if p_latitude not between v_min_lat - 0.03 and v_max_lat + 0.03
     or p_longitude not between v_min_lng - 0.03 and v_max_lng + 0.03 then
    raise exception 'Coordinates are outside the configured route corridor.';
  end if;

  insert into public.bus_locations (
    bus_id, route_id, trip_id, latitude, longitude,
    heading, speed_kmh, accuracy_meters, source, status, recorded_at
  ) values (
    v_trip.bus_id, v_trip.route_id, v_trip.id, p_latitude, p_longitude,
    p_heading, p_speed_kmh, p_accuracy_meters, 'gps', 'active', p_recorded_at
  ) returning * into v_result;
  update public.trips set last_location_at = p_recorded_at where id = v_trip.id;
  return v_result;
end;
$$;

create or replace function public.start_driver_trip(p_bus_id text, p_route_id text)
returns public.trips
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_bus public.buses%rowtype;
  v_trip public.trips%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  select role into v_role from public.profiles where id = auth.uid();
  if coalesce(v_role, '') not in ('driver', 'admin') then
    raise exception 'Only authorized drivers or administrators can start trips.';
  end if;
  select * into v_bus from public.buses where id = p_bus_id;
  if not found or v_bus.assigned_route_id <> p_route_id then
    raise exception 'The bus is not assigned to this route.';
  end if;
  if v_bus.status = 'maintenance' or v_bus.driver_id is null then
    raise exception 'The bus must be available and assigned to a driver.';
  end if;
  if v_role = 'driver' and v_bus.driver_id <> auth.uid() then
    raise exception 'This driver is not assigned to the bus.';
  end if;
  update public.trips
    set status = 'completed', ended_at = now(), sharing_enabled = false
    where bus_id = v_bus.id and status = 'active';
  insert into public.trips (bus_id, route_id, driver_id, status, sharing_enabled, created_by)
  values (v_bus.id, v_bus.assigned_route_id, v_bus.driver_id, 'active', false, auth.uid())
  returning * into v_trip;
  return v_trip;
end;
$$;

create or replace function public.end_driver_trip(p_trip_id uuid)
returns public.trips
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_trip public.trips%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  select role into v_role from public.profiles where id = auth.uid();
  select * into v_trip from public.trips where id = p_trip_id;
  if not found or v_trip.status <> 'active' then
    raise exception 'Active trip not found.';
  end if;
  if coalesce(v_role, '') not in ('driver', 'admin') or (v_role = 'driver' and v_trip.driver_id <> auth.uid()) then
    raise exception 'This account cannot end the trip.';
  end if;
  update public.trips
    set status = 'completed', ended_at = now(), sharing_enabled = false
    where id = p_trip_id
  returning * into v_trip;
  return v_trip;
end;
$$;

create or replace function public.set_trip_location_sharing(p_trip_id uuid, p_enabled boolean)
returns public.trips
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_trip public.trips%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  select role into v_role from public.profiles where id = auth.uid();
  select * into v_trip from public.trips where id = p_trip_id;
  if not found or v_trip.status <> 'active' then
    raise exception 'Active trip not found.';
  end if;
  if coalesce(v_role, '') not in ('driver', 'admin') or (v_role = 'driver' and v_trip.driver_id <> auth.uid()) then
    raise exception 'This account cannot change sharing for the trip.';
  end if;
  update public.trips set sharing_enabled = p_enabled where id = p_trip_id returning * into v_trip;
  return v_trip;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_notification public.notifications%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  select * into v_notification from public.notifications where id = p_notification_id;
  if not found then
    raise exception 'Notification not found.';
  end if;
  if v_notification.user_id is not null and v_notification.user_id <> auth.uid() then
    raise exception 'This notification belongs to another user.';
  end if;
  if v_notification.user_id = auth.uid() then
    update public.notifications set read_at = coalesce(read_at, now()) where id = p_notification_id;
  else
    insert into public.notification_reads (user_id, notification_id)
    values (auth.uid(), p_notification_id)
    on conflict (user_id, notification_id) do nothing;
  end if;
end;
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;
revoke all on function public.submit_bus_location(uuid, double precision, double precision, numeric, numeric, numeric, timestamptz) from public;
grant execute on function public.submit_bus_location(uuid, double precision, double precision, numeric, numeric, numeric, timestamptz) to authenticated;
revoke all on function public.start_driver_trip(text, text) from public;
grant execute on function public.start_driver_trip(text, text) to authenticated;
revoke all on function public.end_driver_trip(uuid) from public;
grant execute on function public.end_driver_trip(uuid) to authenticated;
revoke all on function public.set_trip_location_sharing(uuid, boolean) from public;
grant execute on function public.set_trip_location_sharing(uuid, boolean) to authenticated;
revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime publication (safe to run more than once)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bus_locations'
    ) then
      alter publication supabase_realtime add table public.bus_locations;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end $$;
