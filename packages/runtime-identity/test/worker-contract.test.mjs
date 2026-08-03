import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

for (const file of [
  "../../../apps/worker/src/run-youtube-watchlist.mjs",
  "../../../apps/worker/src/build-daily-candidates.mjs",
]) {
  test(`${file} verifies runtime identity before repository access`, () => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    const verification = source.indexOf("await verifySupabaseRuntime(runtimeEnv)");
    const repository = source.indexOf("createSupabaseWorkerRepository({");
    assert.ok(verification >= 0, "runtime verification is required");
    assert.ok(repository > verification, "repository access must follow verification");
  });
}
