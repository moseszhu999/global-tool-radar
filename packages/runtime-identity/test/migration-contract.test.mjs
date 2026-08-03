import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260803090000_toolradar_runtime_identity_v1.sql",
    import.meta.url,
  ),
  "utf8",
);

test("runtime migration creates a singleton identity with closed RLS", () => {
  assert.match(migration, /create table if not exists public\.toolradar_runtime_identity/);
  assert.match(migration, /primary key default true check \(singleton\)/);
  assert.match(migration, /enable row level security/);
  assert.doesNotMatch(migration, /create policy/i);
});

test("initialization rejects shared projects with foreign public objects", () => {
  assert.match(migration, /requires a dedicated Supabase project/);
  assert.match(migration, /relation\.relname not like 'toolradar\\_%'/);
  assert.match(migration, /pg_catalog\.pg_class/);
});

test("privileged functions use an empty search path and restricted execution", () => {
  const emptySearchPathCount = (
    migration.match(/set search_path = ''/g) ?? []
  ).length;
  assert.ok(emptySearchPathCount >= 6);
  assert.match(
    migration,
    /revoke all on function public\.initialize_toolradar_runtime_identity_v1/,
  );
  assert.match(
    migration,
    /grant execute on function public\.get_toolradar_runtime_identity_v1\(\)\s+to service_role/,
  );
});

test("service role receives explicit Data API table privileges only", () => {
  assert.match(migration, /grant usage on schema public to service_role/);
  assert.match(
    migration,
    /grant select, insert on table[\s\S]*public\.toolradar_source_revisions[\s\S]*to service_role/,
  );
  assert.match(
    migration,
    /grant select on table public\.toolradar_runtime_identity\s+to service_role/,
  );
  assert.match(
    migration,
    /revoke all on table[\s\S]*public\.toolradar_runtime_identity[\s\S]*from anon, authenticated/,
  );
});

test("preflight query is read-only and detects non-ToolRadar objects", () => {
  const sql = readFileSync(
    new URL(
      "../../../supabase/preflight/toolradar_dedicated_project.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(sql, /^--[\s\S]*select/i);
  assert.doesNotMatch(sql, /\b(insert|update|delete|create|alter|drop|truncate)\b/i);
  assert.match(sql, /not like 'toolradar\\_%'/);
});
