-- Serialize GPS inserts with pause/end actions and recheck mutable authorization.
-- The trigger also protects older deployments that insert through the service role.
create or replace function public.guard_bus_location_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_trip public.trips%rowtype;
  v_bus public.buses%rowtype;
  v_route public.routes%rowtype;
  v_now timestamptz;
begin
  -- Pause/end UPDATEs take the same row lock. Whichever transaction gets it
  -- first completes before the other; no insert can commit after a completed
  -- pause/end without observing the changed state.
  select * into v_trip from public.trips where id = new.trip_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'TRIP_NOT_FOUND'; end if;
  if v_trip.bus_id is distinct from new.bus_id or v_trip.route_id is distinct from new.route_id then
    raise exception using errcode = 'P0001', message = 'BUS_MISMATCH';
  end if;
  if v_trip.status <> 'active' or not v_trip.sharing_enabled then
    raise exception using errcode = 'P0001', message = 'SHARING_DISABLED';
  end if;

  select * into v_bus from public.buses where id = v_trip.bus_id for share;
  if not found or v_bus.assigned_route_id is distinct from v_trip.route_id then
    raise exception using errcode = 'P0001', message = 'ROUTE_MISMATCH';
  end if;
  if v_bus.driver_id is distinct from v_trip.driver_id then
    raise exception using errcode = 'P0001', message = 'NOT_ASSIGNED';
  end if;

  select * into v_route from public.routes where id = v_trip.route_id for share;
  if not found then raise exception using errcode = 'P0001', message = 'ROUTE_NOT_FOUND'; end if;
  if new.source = 'gps' then
    if v_route.geometry_source <> 'verified' or jsonb_array_length(v_route.shape) < 2 then
      raise exception using errcode = 'P0001', message = 'ROUTE_NOT_VERIFIED';
    end if;
    if new.latitude is null or new.longitude is null or
       new.latitude not between 17.15 and 17.7 or new.longitude not between 78.1 and 78.8 then
      raise exception using errcode = 'P0001', message = 'OUT_OF_AREA';
    end if;
    -- Use wall-clock time after waiting for locks, not the transaction start.
    v_now := clock_timestamp();
    if new.recorded_at is null or new.recorded_at < v_now - interval '60 seconds'
       or new.recorded_at > v_now + interval '15 seconds' then
      raise exception using errcode = 'P0001', message = 'STALE_LOCATION';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_bus_location_insert() from public, anon, authenticated, service_role;
drop trigger if exists bus_locations_guard_insert on public.bus_locations;
create trigger bus_locations_guard_insert
before insert on public.bus_locations
for each row execute function public.guard_bus_location_insert();

create or replace function public.record_trip_location_time()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.source = 'gps' then
    update public.trips
       set last_location_at = greatest(last_location_at, new.recorded_at)
     where id = new.trip_id;
  end if;
  return new;
end;
$$;
revoke all on function public.record_trip_location_time() from public, anon, authenticated, service_role;
drop trigger if exists bus_locations_record_trip_time on public.bus_locations;
create trigger bus_locations_record_trip_time
after insert on public.bus_locations
for each row execute function public.record_trip_location_time();

-- Only the private server role can call this function. The API has already
-- verified the token and measured the point against p_expected_shape; the
-- function rechecks actor, assignment and the *same* shape under row locks.
create or replace function public.insert_guarded_bus_location(
  p_trip_id uuid,
  p_bus_id text,
  p_actor_id uuid,
  p_expected_route_id text,
  p_expected_shape jsonb,
  p_latitude double precision,
  p_longitude double precision,
  p_heading numeric,
  p_speed_kmh numeric,
  p_accuracy_meters numeric,
  p_recorded_at timestamptz
)
returns public.bus_locations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_trip public.trips%rowtype;
  v_bus public.buses%rowtype;
  v_route public.routes%rowtype;
  v_role text;
  v_result public.bus_locations%rowtype;
begin
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'TRIP_NOT_FOUND'; end if;
  if v_trip.bus_id is distinct from p_bus_id then
    raise exception using errcode = 'P0001', message = 'BUS_MISMATCH';
  end if;
  if v_trip.status <> 'active' or not v_trip.sharing_enabled then
    raise exception using errcode = 'P0001', message = 'SHARING_DISABLED';
  end if;
  if v_trip.route_id is distinct from p_expected_route_id then
    raise exception using errcode = 'P0001', message = 'ROUTE_CHANGED';
  end if;

  select * into v_bus from public.buses where id = p_bus_id for share;
  if not found or v_bus.assigned_route_id is distinct from v_trip.route_id then
    raise exception using errcode = 'P0001', message = 'ROUTE_MISMATCH';
  end if;
  if v_bus.driver_id is distinct from v_trip.driver_id then
    raise exception using errcode = 'P0001', message = 'NOT_ASSIGNED';
  end if;
  select * into v_route from public.routes where id = v_trip.route_id for share;
  if not found then raise exception using errcode = 'P0001', message = 'ROUTE_NOT_FOUND'; end if;
  if v_route.geometry_source <> 'verified' or jsonb_array_length(v_route.shape) < 2 then
    raise exception using errcode = 'P0001', message = 'ROUTE_NOT_VERIFIED';
  end if;
  if v_route.shape is distinct from p_expected_shape then
    raise exception using errcode = 'P0001', message = 'ROUTE_CHANGED';
  end if;
  select role into v_role from public.profiles where id = p_actor_id for share;
  if not found or v_role not in ('driver', 'admin') then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  if v_role = 'driver' and (v_trip.driver_id is distinct from p_actor_id or v_bus.driver_id is distinct from p_actor_id) then
    raise exception using errcode = 'P0001', message = 'NOT_ASSIGNED';
  end if;

  insert into public.bus_locations (
    bus_id, route_id, trip_id, latitude, longitude, heading, speed_kmh,
    accuracy_meters, source, status, recorded_at
  ) values (
    v_trip.bus_id, v_trip.route_id, v_trip.id, p_latitude, p_longitude, p_heading,
    p_speed_kmh, p_accuracy_meters, 'gps', 'active', p_recorded_at
  ) returning * into v_result;
  return v_result;
end;
$$;
revoke all on function public.insert_guarded_bus_location(uuid, text, uuid, text, jsonb, double precision, double precision, numeric, numeric, numeric, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.insert_guarded_bus_location(uuid, text, uuid, text, jsonb, double precision, double precision, numeric, numeric, numeric, timestamptz)
  to service_role;

-- Direct authenticated trip RPCs must not re-enable sharing on an already
-- completed trip when their initial read races with another transition.
create or replace function public.end_driver_trip(p_trip_id uuid)
returns public.trips
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_role text; v_trip public.trips%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found or v_trip.status <> 'active' then raise exception 'Active trip not found.'; end if;
  select role into v_role from public.profiles where id = auth.uid() for share;
  if coalesce(v_role, '') not in ('driver', 'admin') or (v_role = 'driver' and v_trip.driver_id <> auth.uid()) then
    raise exception 'This account cannot end the trip.';
  end if;
  update public.trips set status = 'completed', ended_at = clock_timestamp(), sharing_enabled = false
    where id = p_trip_id returning * into v_trip;
  return v_trip;
end;
$$;

create or replace function public.set_trip_location_sharing(p_trip_id uuid, p_enabled boolean)
returns public.trips
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_role text; v_trip public.trips%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if p_enabled is null then raise exception 'A sharing state is required.'; end if;
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found or v_trip.status <> 'active' then raise exception 'Active trip not found.'; end if;
  select role into v_role from public.profiles where id = auth.uid() for share;
  if coalesce(v_role, '') not in ('driver', 'admin') or (v_role = 'driver' and v_trip.driver_id <> auth.uid()) then
    raise exception 'This account cannot change sharing for the trip.';
  end if;
  update public.trips set sharing_enabled = p_enabled where id = p_trip_id returning * into v_trip;
  return v_trip;
end;
$$;
revoke all on function public.end_driver_trip(uuid) from public, anon;
revoke all on function public.set_trip_location_sharing(uuid, boolean) from public, anon;
grant execute on function public.end_driver_trip(uuid) to authenticated;
grant execute on function public.set_trip_location_sharing(uuid, boolean) to authenticated;

-- Ensure PostgREST learns the new service-only RPC immediately after commit.
notify pgrst, 'reload schema';
