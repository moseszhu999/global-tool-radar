import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("storyboard review page exposes timeline and human capture gates", async () => {
  const html = await read("apps/web/storyboard.html");
  const app = await read("apps/web/storyboard.mjs");
  const value = JSON.parse(await read("apps/web/data/replit-design-storyboard-package.json"));
  assert.match(html, /SECOND PRODUCTION MILESTONE/);
  assert.match(html, /必须人工完成的隔离录屏/);
  assert.match(app, /toolradar\.storyboard-package\.v1/);
  assert.equal(value.timelineDurationSeconds, 89);
  assert.equal(value.gates.renderAllowed, false);
  assert.equal(value.nextMilestone, "OWNED_ASSET_CAPTURE_AND_RENDER");
});
