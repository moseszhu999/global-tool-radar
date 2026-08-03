import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationUrls = [
  "../../../neon/migrations/20260803100000_toolradar_neon_tables_v1.sql",
  "../../../neon/migrations/20260803101000_toolradar_neon_identity_v1.sql",
  "../../../neon/migrations/20260803102000_toolradar_neon_runtime_functions_v1.sql",
];
const migrations = migrationUrls.map((path) =>
  readFileSync(new URL(path, import.meta.url), "utf8"),
);
const joined = migrations.join("\n");

test("Neon migrations create the eight bounded runtime tables", () => {
  for (const table of [
    "toolradar_tools",
    "toolradar_source_identities",
    "toolradar_source_revisions",
    "toolradar_metric_snapshots",
    "toolradar_tool_source_links",
    "toolradar_youtube_channel_watchlist",
    "toolradar_ingestion_runs",
    "toolradar_runtime_identity",
  ]) {
    assert.match(joined, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`));
  }
});

test("runtime identity binds Neon project, branch, database, and installation", () => {
  assert.match(joined, /provider text NOT NULL DEFAULT 'neon'/);
  assert.match(joined, /p_project_id text/);
  assert.match(joined, /p_branch_id text/);
  assert.match(joined, /p_database_name text/);
  assert.match(joined, /p_installation_id uuid/);
  assert.match(joined, /requires a dedicated Neon database/);
});

test("immutable evidence tables retain append-only triggers", () => {
  assert.match(joined, /toolradar_source_revisions_append_only/);
  assert.match(joined, /toolradar_metric_snapshots_append_only/);
  assert.match(joined, /is append-only/);
});

test("atomic capture uses named constraints and leases use skip locked", () => {
  assert.match(joined, /persist_toolradar_source_capture_v1/);
  assert.match(joined, /ON CONFLICT ON CONSTRAINT toolradar_source_revisions_source_identity_id_content_hash_key/);
  assert.match(joined, /FOR UPDATE SKIP LOCKED/);
  assert.match(joined, /watchlist lease is not owned by worker/);
});

test("Neon migrations contain no Supabase roles or browser policies", () => {
  assert.doesNotMatch(joined, /\b(service_role|anon|authenticated)\b/);
  assert.doesNotMatch(joined, /enable row level security/i);
  assert.doesNotMatch(joined, /create policy/i);
});

test("all privileged functions use an empty search path", () => {
  const securityDefinerCount = (joined.match(/SECURITY DEFINER/g) ?? []).length;
  const emptySearchPathCount = (joined.match(/SET search_path = ''/g) ?? []).length;
  assert.ok(securityDefinerCount >= 7);
  assert.ok(emptySearchPathCount >= securityDefinerCount);
});
