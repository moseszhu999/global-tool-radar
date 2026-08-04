import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildStoryboardManifest,
  validateStoryboardManifest,
} from "../src/index.mjs";

const productionCase = JSON.parse(await readFile(
  new URL("../../../apps/web/data/replit-design-production-case.json", import.meta.url),
  "utf8",
));

test("turns the complete script into a contiguous storyboard and asset manifest", () => {
  const value = buildStoryboardManifest(productionCase, {
    generatedAt: "2026-08-04T09:30:00.000Z",
  });
  assert.equal(validateStoryboardManifest(value), true);
  assert.equal(value.storyboard.shots.length, 7);
  assert.equal(value.timelineDurationSeconds, 89);
  assert.equal(value.storyboard.shots[0].startSecond, 0);
  assert.equal(value.storyboard.shots.at(-1).endSecond, 89);
  assert.equal(value.nextMilestone, "OWNED_ASSET_CAPTURE_AND_RENDER");
});

test("requires only owned, generated, or licensed assets", () => {
  const value = buildStoryboardManifest(productionCase);
  assert.equal(value.policy.sourceVideoDownloadAllowed, false);
  assert.equal(value.policy.thirdPartyFootageAllowed, false);
  assert.ok(value.assetManifest.assets.every((asset) =>
    ["owned_generated", "owned_recording", "licensed_or_original_only"].includes(asset.ownership),
  ));
  assert.equal(value.assetManifest.captureTasks.length, 2);
});

test("keeps rendering and publication blocked before human capture", () => {
  const value = buildStoryboardManifest(productionCase);
  assert.equal(value.gates.humanCaptureRequired, true);
  assert.equal(value.gates.renderAllowed, false);
  assert.equal(value.gates.publicationAllowed, false);
});

test("rejects a broken or gapped timeline", () => {
  const value = buildStoryboardManifest(productionCase);
  const invalid = structuredClone(value);
  invalid.storyboard.shots[1].startSecond += 1;
  assert.throws(() => validateStoryboardManifest(invalid), /timeline must be contiguous/);
});
