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
  `);
  for (const path of ["20261027000000_init.sql", "20261030000000_published_routes.sql"]) {
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

  it("revokes direct client GPS writes and the less strict legacy GPS RPC", async () => {
    const result = await db.query<{ direct_write: boolean; rpc_execute: boolean }>(`select
      has_table_privilege('authenticated', 'public.bus_locations', 'INSERT') direct_write,
      has_function_privilege('authenticated', 'public.submit_bus_location(uuid,double precision,double precision,numeric,numeric,numeric,timestamptz)', 'EXECUTE') rpc_execute`);
    expect(result.rows[0]).toEqual({ direct_write: false, rpc_execute: false });
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
