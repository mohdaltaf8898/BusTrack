-- BusTrack sample seed data
-- Approximate Hyderabad coordinates for a DESIGN-THINKING PROTOTYPE ONLY.
-- These are NOT official Lords Institute routes, stops, schedules, or GPS traces.
-- Run after 20261027000000_init.sql. No credentials or personal data are included.

-- Create auth users in Supabase Auth first, then promote them:
-- update public.profiles set role = 'admin' where id = '<ADMIN_USER_UUID>';
-- update public.profiles set role = 'driver' where id = '<DRIVER_USER_UUID>';
-- update public.buses set driver_id = '<DRIVER_USER_UUID>' where id = 'bus-bt01';

begin;

insert into public.routes (
  id, code, route_name, start_location, destination, bus_number, description,
  average_speed_kmh, estimated_duration_minutes, status, color, shape, stop_indices
) values (
  'route-a', 'R-A', 'Gandipet → Mehdipatnam', 'LIET Main Gate, Gandipet', 'Mehdipatnam Bus Stand',
  'BT-01', 'Western campus connector via TSPA, Narsingi, Shaikpet and Tolichowki.', 26, 42, 'active',
  '#2563eb', '[{"lat":17.3418,"lng":78.368},{"lat":17.3468,"lng":78.3684},{"lat":17.3512,"lng":78.369},{"lat":17.3553,"lng":78.3692},{"lat":17.3648,"lng":78.3648},{"lat":17.3748,"lng":78.3599},{"lat":17.3825,"lng":78.3578},{"lat":17.3876,"lng":78.357},{"lat":17.389,"lng":78.363},{"lat":17.3965,"lng":78.3752},{"lat":17.4041,"lng":78.3886},{"lat":17.4016,"lng":78.3985},{"lat":17.4072,"lng":78.4128},{"lat":17.4126,"lng":78.427},{"lat":17.4138,"lng":78.4317},{"lat":17.405,"lng":78.4332},{"lat":17.3998,"lng":78.4322},{"lat":17.3959,"lng":78.4312}]'::jsonb, '[0,3,7,11,14,17]'::jsonb
)
on conflict (id) do update set
  code = excluded.code,
  route_name = excluded.route_name,
  start_location = excluded.start_location,
  destination = excluded.destination,
  bus_number = excluded.bus_number,
  description = excluded.description,
  average_speed_kmh = excluded.average_speed_kmh,
  estimated_duration_minutes = excluded.estimated_duration_minutes,
  status = excluded.status,
  color = excluded.color,
  shape = excluded.shape,
  stop_indices = excluded.stop_indices,
  updated_at = now();

insert into public.stops (id, route_id, stop_name, latitude, longitude, stop_order) values
  ('a-1', 'route-a', 'LIET Main Gate', 17.3418, 78.368, 1),
  ('a-2', 'route-a', 'TSPA Junction', 17.3553, 78.3692, 2),
  ('a-3', 'route-a', 'Narsingi X Roads', 17.3876, 78.357, 3),
  ('a-4', 'route-a', 'Shaikpet', 17.4016, 78.3985, 4),
  ('a-5', 'route-a', 'Tolichowki', 17.4138, 78.4317, 5),
  ('a-6', 'route-a', 'Mehdipatnam Bus Stand', 17.3959, 78.4312, 6)
on conflict (id) do update set
  route_id = excluded.route_id,
  stop_name = excluded.stop_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  stop_order = excluded.stop_order,
  updated_at = now();

insert into public.routes (
  id, code, route_name, start_location, destination, bus_number, description,
  average_speed_kmh, estimated_duration_minutes, status, color, shape, stop_indices
) values (
  'route-b', 'R-B', 'Gachibowli → Kukatpally', 'LIET Main Gate, Gandipet', 'KPHB Colony',
  'BT-02', 'North-west corridor via Gachibowli, HITEC City and Kukatpally Y Junction.', 28, 55, 'active',
  '#0f766e', '[{"lat":17.3418,"lng":78.368},{"lat":17.3515,"lng":78.3675},{"lat":17.362,"lng":78.3668},{"lat":17.373,"lng":78.3542},{"lat":17.393,"lng":78.3475},{"lat":17.4162,"lng":78.344},{"lat":17.4372,"lng":78.3444},{"lat":17.442,"lng":78.3558},{"lat":17.4458,"lng":78.3695},{"lat":17.4435,"lng":78.3772},{"lat":17.466,"lng":78.3875},{"lat":17.4762,"lng":78.4028},{"lat":17.483,"lng":78.417},{"lat":17.4892,"lng":78.4082},{"lat":17.487,"lng":78.398}]'::jsonb, '[0,2,6,9,12,14]'::jsonb
)
on conflict (id) do update set
  code = excluded.code,
  route_name = excluded.route_name,
  start_location = excluded.start_location,
  destination = excluded.destination,
  bus_number = excluded.bus_number,
  description = excluded.description,
  average_speed_kmh = excluded.average_speed_kmh,
  estimated_duration_minutes = excluded.estimated_duration_minutes,
  status = excluded.status,
  color = excluded.color,
  shape = excluded.shape,
  stop_indices = excluded.stop_indices,
  updated_at = now();

insert into public.stops (id, route_id, stop_name, latitude, longitude, stop_order) values
  ('b-1', 'route-b', 'LIET Main Gate', 17.3418, 78.368, 1),
  ('b-2', 'route-b', 'Himayat Sagar Junction', 17.362, 78.3668, 2),
  ('b-3', 'route-b', 'Gachibowli X Roads', 17.4372, 78.3444, 3),
  ('b-4', 'route-b', 'HITEC City', 17.4435, 78.3772, 4),
  ('b-5', 'route-b', 'Kukatpally Y Junction', 17.483, 78.417, 5),
  ('b-6', 'route-b', 'KPHB Colony', 17.487, 78.398, 6)
on conflict (id) do update set
  route_id = excluded.route_id,
  stop_name = excluded.stop_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  stop_order = excluded.stop_order,
  updated_at = now();

insert into public.routes (
  id, code, route_name, start_location, destination, bus_number, description,
  average_speed_kmh, estimated_duration_minutes, status, color, shape, stop_indices
) values (
  'route-c', 'R-C', 'Appa Junction → LB Nagar', 'LIET Main Gate, Gandipet', 'LB Nagar Metro',
  'BT-03', 'South-east corridor via Aramgarh, Bairamalguda and Dilsukhnagar.', 30, 48, 'scheduled',
  '#7c3aed', '[{"lat":17.3418,"lng":78.368},{"lat":17.337,"lng":78.3702},{"lat":17.334,"lng":78.3728},{"lat":17.3325,"lng":78.3758},{"lat":17.3298,"lng":78.396},{"lat":17.3326,"lng":78.421},{"lat":17.3372,"lng":78.4435},{"lat":17.3395,"lng":78.4516},{"lat":17.3412,"lng":78.4615},{"lat":17.3402,"lng":78.4725},{"lat":17.339,"lng":78.481},{"lat":17.3416,"lng":78.4865},{"lat":17.3418,"lng":78.4927},{"lat":17.3505,"lng":78.504},{"lat":17.3612,"lng":78.5168},{"lat":17.3688,"lng":78.5247},{"lat":17.3605,"lng":78.537},{"lat":17.3528,"lng":78.545},{"lat":17.3484,"lng":78.551}]'::jsonb, '[0,3,7,10,12,15,18]'::jsonb
)
on conflict (id) do update set
  code = excluded.code,
  route_name = excluded.route_name,
  start_location = excluded.start_location,
  destination = excluded.destination,
  bus_number = excluded.bus_number,
  description = excluded.description,
  average_speed_kmh = excluded.average_speed_kmh,
  estimated_duration_minutes = excluded.estimated_duration_minutes,
  status = excluded.status,
  color = excluded.color,
  shape = excluded.shape,
  stop_indices = excluded.stop_indices,
  updated_at = now();

insert into public.stops (id, route_id, stop_name, latitude, longitude, stop_order) values
  ('c-1', 'route-c', 'LIET Main Gate', 17.3418, 78.368, 1),
  ('c-2', 'route-c', 'Appa Junction', 17.3325, 78.3758, 2),
  ('c-3', 'route-c', 'Aramgarh X Roads', 17.3395, 78.4516, 3),
  ('c-4', 'route-c', 'Chandrayangutta', 17.339, 78.481, 4),
  ('c-5', 'route-c', 'Bairamalguda', 17.3418, 78.4927, 5),
  ('c-6', 'route-c', 'Dilsukhnagar', 17.3688, 78.5247, 6),
  ('c-7', 'route-c', 'LB Nagar Metro', 17.3484, 78.551, 7)
on conflict (id) do update set
  route_id = excluded.route_id,
  stop_name = excluded.stop_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  stop_order = excluded.stop_order,
  updated_at = now();

insert into public.buses (id, bus_number, assigned_route_id, driver_id, capacity, status, model, service_availability) values
  ('bus-bt01', 'BT-01', 'route-a', null, 52, 'active', 'College coach · demo', 'Weekdays · morning and afternoon trips (sample)'),
  ('bus-bt02', 'BT-02', 'route-b', null, 48, 'active', 'College coach · demo', 'Weekdays · morning and afternoon trips (sample)'),
  ('bus-bt03', 'BT-03', 'route-c', null, 45, 'scheduled', 'College coach · demo', 'Awaiting driver assignment (sample)')
on conflict (id) do update set
  bus_number = excluded.bus_number,
  assigned_route_id = excluded.assigned_route_id,
  capacity = excluded.capacity,
  status = excluded.status,
  model = excluded.model,
  service_availability = excluded.service_availability,
  updated_at = now();

insert into public.notifications (id, user_id, bus_id, route_id, title, message, type, is_simulated, created_at)
values (
  '00000000-0000-4000-8000-000000000001', null, null, null,
  'BusTrack backend initialized',
  'Sample routes are configured. Bus positions remain simulated until an authorized driver starts a trip and enables GPS sharing.',
  'system', false, now()
)
on conflict (id) do nothing;

commit;
