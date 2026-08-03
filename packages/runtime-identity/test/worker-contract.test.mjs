import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

for (const contract of [
  {
    path: "../../../apps/worker/src/run-youtube-watchlist.mjs",
    access: "const repository = createNeonWorkerRepository",
  },
  {
    path: "../../../apps/worker/src/build-daily-candidates.mjs",
    access: "const repository = createNeonWorkerRepository",
  },
  {
    path: "../../../apps/worker/src/seed-youtube-watchlist.mjs",
    access: "const result = await seedYouTubeWatchlist",
  },
  {
    path: "../../../apps/worker/src/bootstrap-youtube-rss.mjs",
    access: "const repository = createNeonWorkerRepository",
  },
]) {
  test(`${contract.path} verifies Neon runtime before database access`, () => {
    const source = readFileSync(new URL(contract.path, import.meta.url), "utf8");
    const verifyIndex = source.indexOf("await verifyNeonRuntime");
    const accessIndex = source.indexOf(contract.access);
    assert.ok(verifyIndex >= 0);
    assert.ok(accessIndex > verifyIndex);
    assert.doesNotMatch(source, /Supabase|serviceRoleKey|SUPABASE_/);
  });
}
