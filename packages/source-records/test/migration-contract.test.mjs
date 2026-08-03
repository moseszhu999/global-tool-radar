import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../../supabase/migrations/20260803081000_toolradar_source_snapshot_entity_v1.sql",
  import.meta.url,
);

test("persistence separates stable identity from immutable revisions", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /toolradar_source_identities/);
  assert.match(sql, /unique \(source_type, external_id\)/);
  assert.match(sql, /toolradar_source_revisions/);
  assert.match(sql, /unique \(source_identity_id, content_hash\)/);
  assert.match(sql, /toolradar_source_revisions_append_only/);
  assert.match(sql, /toolradar_metric_snapshots_append_only/);
  assert.doesNotMatch(sql, /create policy/i);
});
