import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("production case page exposes the source-bound script milestone", async () => {
  const html = await read("apps/web/production-case.html");
  const app = await read("apps/web/production-case.mjs");
  const value = JSON.parse(await read("apps/web/data/replit-design-production-case.json"));

  assert.match(html, /FIRST REAL PRODUCTION CASE/);
  assert.match(html, /完整原创口播脚本/);
  assert.match(app, /toolradar\.video-production-case\.v1/);
  assert.equal(value.status, "SCRIPT_READY_FOR_HUMAN_REVIEW");
  assert.equal(value.gates.publicationAllowed, false);
  assert.equal(value.nextMilestone, "STORYBOARD_AND_ASSET_MANIFEST");
});
