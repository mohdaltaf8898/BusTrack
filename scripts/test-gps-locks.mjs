// Optional real-PostgreSQL concurrency test. Never point this at application data.
// Create a fresh local disposable database named bustrack_gps_test_<suffix>, then:
// PGHOST=<local socket or 127.0.0.1> PGUSER=<superuser> PGDATABASE=bustrack_gps_test_<suffix> npm run test:gps-locks
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import pg from "pg";

const { Client } = pg;
const database = process.env.PGDATABASE ?? "";
const host = process.env.PGHOST ?? "127.0.0.1";
if (!/^bustrack_gps_test_[a-z0-9_]+$/.test(database) ||
    !(host.startsWith("/") || host === "127.0.0.1" || host === "::1" || host === "localhost")) {
  throw new Error("Use a fresh LOCAL database named bustrack_gps_test_<suffix>; never use a hosted or production database.");
}
const config = {
  host, port: Number(process.env.PGPORT || 5432), database,
  user: process.env.PGUSER || process.env.USER,
  password: process.env.PGPASSWORD,
};
const makeClient = () => new Client(config);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForLock(observer, pid) {
  for (let i = 0; i < 100; i += 1) {
    const result = await observer.query("select wait_event_type from pg_stat_activity where pid = $1", [pid]);
    if (result.rows[0]?.wait_event_type === "Lock") return;
    await sleep(20);
  }
  throw new Error(`Backend ${pid} did not wait for the expected row lock.`);
}

const driverId = "10000000-0000-4000-8000-000000000003";
const tripId = "20000000-0000-4000-8000-000000000001";
const setup = makeClient();
await setup.connect();
const pauser = makeClient();
const writer = makeClient();
const observer = makeClient();
try {
  const preflight = await setup.query(`select
    exists(select 1 from pg_namespace where nspname = 'auth') as has_auth,
    exists(select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'S')) as has_public_objects`);
  if (preflight.rows[0].has_auth || preflight.rows[0].has_public_objects) {
    throw new Error("The test database is not empty. Create a fresh disposable database.");
  }
  await setup.query(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
    end $$;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant usage, select on sequences to service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);
  const migrationDir = new URL("../supabase/migrations/", import.meta.url);
  const migrations = (await readdir(migrationDir)).filter((name) => name.endsWith(".sql")).sort();
  for (const name of migrations) await setup.query(await readFile(new URL(name, migrationDir), "utf8"));
  await setup.query(await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"));
  await setup.query(`
    insert into auth.users (id, email) values ('${driverId}', 'gps-lock-test@example.test');
    update public.profiles set role = 'driver' where id = '${driverId}';
    update public.buses set driver_id = '${driverId}' where id = 'bus-sim01';
    update public.routes set geometry_source = 'verified' where id = 'route-01';
    insert into public.trips (id, bus_id, route_id, driver_id, status, sharing_enabled)
      values ('${tripId}', 'bus-sim01', 'route-01', '${driverId}', 'active', true);
  `);
  const shape = JSON.stringify((await setup.query("select shape from public.routes where id = 'route-01'")).rows[0].shape);
  const sql = `select id from public.insert_guarded_bus_location(
    $1, 'bus-sim01', $2, 'route-01', $3::jsonb, 17.389948, 78.451726,
    null, null, null, coalesce($4::timestamptz, clock_timestamp()))`;
  const args = [tripId, driverId, shape, null];
  await Promise.all([pauser.connect(), writer.connect(), observer.connect()]);
  for (const connection of [pauser, writer, observer]) await connection.query("set statement_timeout = '10s'");
  await writer.query("set role service_role");

  await pauser.query("begin");
  await pauser.query("update public.trips set sharing_enabled = false where id = $1", [tripId]);
  const blockedWrite = writer.query(sql, args);
  await waitForLock(observer, writer.processID);
  await pauser.query("commit");
  await assert.rejects(blockedWrite, /SHARING_DISABLED/);
  assert.equal((await observer.query("select count(*)::int as n from public.bus_locations")).rows[0].n, 0);
  console.log("PASS: pause commits first; blocked GPS write is rejected");

  await observer.query("update public.trips set sharing_enabled = true where id = $1", [tripId]);
  await writer.query("begin");
  await writer.query(sql, args);
  const blockedPause = pauser.query("update public.trips set sharing_enabled = false where id = $1", [tripId]);
  await waitForLock(observer, pauser.processID);
  await writer.query("commit");
  await blockedPause;
  await assert.rejects(writer.query(sql, args), /SHARING_DISABLED/);
  assert.equal((await observer.query("select count(*)::int as n from public.bus_locations")).rows[0].n, 1);
  console.log("PASS: GPS commits first; pause waits and later GPS writes are rejected");

  await observer.query("update public.trips set sharing_enabled = true where id = $1", [tripId]);
  await pauser.query("begin");
  await pauser.query("update public.trips set status = 'completed', sharing_enabled = false, ended_at = clock_timestamp() where id = $1", [tripId]);
  const blockedAfterEnd = writer.query(sql, args);
  await waitForLock(observer, writer.processID);
  await pauser.query("commit");
  await assert.rejects(blockedAfterEnd, /SHARING_DISABLED/);
  console.log("PASS: end commits first; blocked GPS write is rejected");

  await observer.query("update public.trips set status = 'active', sharing_enabled = true, ended_at = null where id = $1", [tripId]);
  await pauser.query("begin");
  await pauser.query("update public.trips set sharing_enabled = false where id = $1", [tripId]);
  const legacy = writer.query(`insert into public.bus_locations
    (bus_id, route_id, trip_id, latitude, longitude, source, recorded_at)
    values ('bus-sim01', 'route-01', $1, 17.389948, 78.451726, 'gps', clock_timestamp())`, [tripId]);
  await waitForLock(observer, writer.processID);
  await pauser.query("commit");
  await assert.rejects(legacy, /SHARING_DISABLED/);
  console.log("PASS: legacy service-role inserts are guarded by the table trigger");

  await observer.query("update public.trips set status = 'active', sharing_enabled = true, ended_at = null where id = $1", [tripId]);
  await writer.query("reset role");
  await writer.query("set role authenticated");
  await writer.query("select set_config('request.jwt.claim.sub', $1, false)", [driverId]);
  await pauser.query("begin");
  await pauser.query("update public.trips set status = 'completed', sharing_enabled = false, ended_at = clock_timestamp() where id = $1", [tripId]);
  const sharing = writer.query("select public.set_trip_location_sharing($1, true)", [tripId]);
  await waitForLock(observer, writer.processID);
  await pauser.query("commit");
  await assert.rejects(sharing, /Active trip not found/);
  assert.equal((await observer.query("select sharing_enabled from public.trips where id = $1", [tripId])).rows[0].sharing_enabled, false);
  await writer.query("reset role");
  await writer.query("set role service_role");
  console.log("PASS: delayed sharing RPC cannot reactivate a completed trip");

  await observer.query("update public.trips set status = 'active', sharing_enabled = true, ended_at = null where id = $1", [tripId]);
  await pauser.query("begin");
  await pauser.query("select id from public.trips where id = $1 for update", [tripId]);
  const almostStale = new Date(Date.now() - 59_800).toISOString();
  const delayed = writer.query(sql, [tripId, driverId, shape, almostStale]);
  await waitForLock(observer, writer.processID);
  await sleep(400);
  await pauser.query("commit");
  await assert.rejects(delayed, /STALE_LOCATION/);
  console.log("PASS: timestamp freshness is checked again after waiting for locks");

  await observer.query("update public.routes set shape = shape || '[{\"lat\":17.4,\"lng\":78.4}]'::jsonb where id = 'route-01'");
  await assert.rejects(writer.query(sql, args), /ROUTE_CHANGED/);
  await observer.query("update public.routes set shape = $1::jsonb where id = 'route-01'", [shape]);
  await observer.query("update public.profiles set role = 'student' where id = $1", [driverId]);
  await assert.rejects(writer.query(sql, args), /FORBIDDEN/);
  console.log("PASS: a changed corridor or demoted actor is rejected");
} finally {
  await Promise.allSettled([pauser.end(), writer.end(), observer.end(), setup.end()]);
}
