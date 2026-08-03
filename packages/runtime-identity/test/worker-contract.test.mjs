import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

for (const path of [
  "../../../apps/worker/src/run-youtube-watchlist.mjs",
  "../../../apps/worker/src/build-daily-candidates.mjs",
]) {
  test(`${path} verifies Neon runtime before repository access`, () => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    const verifyIndex = source.indexOf("await verifyNeonRuntime");
    const repositoryIndex = source.indexOf(
      "const repository = createNeonWorkerRepository",
    );
    assert.ok(verifyIndex >= 0);
    assert.ok(repositoryIndex > verifyIndex);
    assert.doesNotMatch(source, /Supabase|serviceRoleKey|SUPABASE_/);
  });
}
