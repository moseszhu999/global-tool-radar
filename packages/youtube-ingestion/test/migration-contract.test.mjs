import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../../supabase/migrations/20260803083000_toolradar_youtube_watchlist_runtime_v1.sql",
  import.meta.url,
);

test("watchlist migration has leases, atomic completion RPCs, and closed RLS", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /claim_toolradar_youtube_watchlist_v1/i);
  assert.match(sql, /complete_toolradar_youtube_scan_v1/i);
  assert.match(sql, /fail_toolradar_youtube_scan_v1/i);
  assert.match(sql, /get_toolradar_youtube_snapshot_series_v1/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all.+anon, authenticated/is);
  assert.doesNotMatch(sql, /create policy/i);
});
