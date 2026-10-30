// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Lightweight Postgres-compatible smoke test. Supabase Auth/Realtime are only
// minimal local stubs here: this does not replace tests against a real project.
let db: PGlite;
let seed: string;
const adminId = "10000000-0000-4000-8000-000000000001";
const studentId = "10000000-0000-4000-8000-000000000002";
const driverId = "10000000-0000-4000-8000-000000000003";
const otherDriverId = "10000000-0000-4000-8000-000000000004";
const tripId = "20000000-0000-4000-8000-000000000001";

beforeAll(async () => {
  db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
    -- Supabase also grants EXECUTE directly to these roles for new functions.
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);
  for (const path of ["20261030135413_bustrack_init.sql", "20261030135426_bustrack_published_routes.sql", "20261030140136_bustrack_function_grants.sql", "20261030144351_bustrack_guarded_gps.sql"]) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${path}`, import.meta.url), "utf8"));
  }
  seed = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");
  await db.exec(seed);
}, 30_000);

afterAll(async () => { await db?.close(); });

describe("PostgreSQL migrations and 2025–26 seed", () => {
  it("creates 16 routes and preserves missing locations and times", async () => {
    const result = await db.query<{
      routes: number; buses: number; unmapped: number; missing_times: number;
    }>(`select
      (select count(*)::int from public.routes) routes,
      (select count(*)::int from public.buses) buses,
      (select count(*)::int from public.stops where latitude is null and longitude is null) unmapped,
      (select count(*)::int from public.stops where scheduled_time is null) missing_times`);
    expect(result.rows[0]).toMatchObject({ routes: 16, buses: 16 });
    expect(result.rows[0].unmapped).toBeGreaterThan(0);
    expect(result.rows[0].missing_times).toBeGreaterThan(0);
    await expect(db.exec("update public.stops set latitude = 17.4 where id = 'r01-s04'")).rejects.toThrow(/stops_coordinate_pair/);
  });

  it("allows trusted bootstrap but blocks an authenticated student's self-promotion", async () => {
    await db.exec(`insert into auth.users (id, email) values
      ('${adminId}', 'admin@example.test'), ('${studentId}', 'student@example.test');
      update public.profiles set role = 'admin' where id = '${adminId}';`);
    const admin = await db.query<{ role: string }>(`select role from public.profiles where id = '${adminId}'`);
    expect(admin.rows[0].role).toBe("admin");

    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${studentId}', false);`);
    await expect(db.exec(`update public.profiles set role = 'admin' where id = '${studentId}'`)).rejects.toThrow(/Only an administrator/);
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  });

  it("revokes direct GPS writes, the legacy GPS RPC, and anonymous access to privileged functions", async () => {
    const result = await db.query<{
      direct_write: boolean; rpc_execute: boolean; anon_trip: boolean; auth_trip: boolean; anon_trigger: boolean;
      anon_guarded: boolean; auth_guarded: boolean; service_guarded: boolean; auth_guard_trigger: boolean;
    }>(`select
      has_table_privilege('authenticated', 'public.bus_locations', 'INSERT') direct_write,
      has_function_privilege('authenticated', 'public.submit_bus_location(uuid,double precision,double precision,numeric,numeric,numeric,timestamptz)', 'EXECUTE') rpc_execute,
      has_function_privilege('anon', 'public.start_driver_trip(text,text)', 'EXECUTE') anon_trip,
      has_function_privilege('authenticated', 'public.start_driver_trip(text,text)', 'EXECUTE') auth_trip,
      has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE') anon_trigger,
      has_function_privilege('anon', 'public.insert_guarded_bus_location(uuid,text,uuid,text,jsonb,double precision,double precision,numeric,numeric,numeric,timestamptz)', 'EXECUTE') anon_guarded,
      has_function_privilege('authenticated', 'public.insert_guarded_bus_location(uuid,text,uuid,text,jsonb,double precision,double precision,numeric,numeric,numeric,timestamptz)', 'EXECUTE') auth_guarded,
      has_function_privilege('service_role', 'public.insert_guarded_bus_location(uuid,text,uuid,text,jsonb,double precision,double precision,numeric,numeric,numeric,timestamptz)', 'EXECUTE') service_guarded,
      has_function_privilege('authenticated', 'public.guard_bus_location_insert()', 'EXECUTE') auth_guard_trigger`);
    expect(result.rows[0]).toEqual({
      direct_write: false, rpc_execute: false, anon_trip: false, auth_trip: true, anon_trigger: false,
      anon_guarded: false, auth_guarded: false, service_guarded: true, auth_guard_trigger: false,
    });
  });

  it("rechecks GPS authorization, route shape and sharing in the database transaction", async () => {
    await db.exec(`insert into auth.users (id, email) values
      ('${driverId}', 'driver@example.test'), ('${otherDriverId}', 'other@example.test');
      update public.profiles set role = 'driver' where id in ('${driverId}', '${otherDriverId}');
      update public.buses set driver_id = '${driverId}' where id = 'bus-sim01';
      update public.routes set geometry_source = 'verified' where id = 'route-01';
      insert into public.trips (id, bus_id, route_id, driver_id, status, sharing_enabled)
        values ('${tripId}', 'bus-sim01', 'route-01', '${driverId}', 'active', true);`);
    const route = await db.query<{ shape: unknown }>("select shape from public.routes where id = 'route-01'");
    const shape = JSON.stringify(route.rows[0].shape);
    const submit = (actor: string, expectedShape = shape, timestamp = new Date().toISOString()) => db.query(
      `select id from public.insert_guarded_bus_location($1, $2, $3, $4, $5::jsonb, $6, $7, null, null, null, $8::timestamptz)`,
      [tripId, "bus-sim01", actor, "route-01", expectedShape, 17.389948, 78.451726, timestamp],
    );
    await expect(submit(studentId)).rejects.toThrow(/FORBIDDEN/);
    await expect(submit(otherDriverId)).rejects.toThrow(/NOT_ASSIGNED/);
    await expect(submit(driverId, "[]")).rejects.toThrow(/ROUTE_CHANGED/);
    await expect(submit(driverId, shape, new Date(Date.now() - 120_000).toISOString())).rejects.toThrow(/STALE_LOCATION/);
    const recordedAt = new Date().toISOString();
    expect((await submit(driverId, shape, recordedAt)).rows).toHaveLength(1);
    const trip = await db.query<{ last_location_at: string | Date }>(`select last_location_at from public.trips where id = '${tripId}'`);
    expect(new Date(trip.rows[0].last_location_at).getTime()).toBe(new Date(recordedAt).getTime());

    await db.exec(`update public.trips set sharing_enabled = false where id = '${tripId}'`);
    await expect(submit(driverId)).rejects.toThrow(/SHARING_DISABLED/);
    // Older application deployments use direct service-role inserts: the table
    // trigger must still reject those after a pause.
    await expect(db.exec(`insert into public.bus_locations
      (bus_id, route_id, trip_id, latitude, longitude, source, recorded_at)
      values ('bus-sim01', 'route-01', '${tripId}', 17.389948, 78.451726, 'gps', now())`)).rejects.toThrow(/SHARING_DISABLED/);
    const count = await db.query<{ count: number }>(`select count(*)::int as count from public.bus_locations where trip_id = '${tripId}'`);
    expect(count.rows[0].count).toBe(1);
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${driverId}', false);`);
    await db.query(`select public.end_driver_trip('${tripId}'::uuid)`);
    await expect(db.query(`select public.set_trip_location_sharing('${tripId}'::uuid, true)`)).rejects.toThrow(/Active trip not found/);
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  });

  it("does not overwrite operator data on reseeding and invalidates changed stop geometry", async () => {
    await db.exec("update public.routes set geometry_source = 'verified' where id = 'route-01'");
    await db.exec(seed);
    let result = await db.query<{ geometry_source: string }>("select geometry_source from public.routes where id = 'route-01'");
    expect(result.rows[0].geometry_source).toBe("verified");
    await db.exec("update public.stops set latitude = latitude + 0.0001 where id = 'r01-s01'");
    result = await db.query<{ geometry_source: string }>("select geometry_source from public.routes where id = 'route-01'");
    expect(result.rows[0].geometry_source).toBe("straight");
  });
});
