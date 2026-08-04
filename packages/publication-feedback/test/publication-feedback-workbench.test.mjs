import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pagePath = new URL("../../../apps/web/publication-feedback-workbench.html", import.meta.url);
const html = await readFile(pagePath, "utf8");

test("feedback workbench requires receipt, multiple snapshots and explicit review", () => {
  assert.match(html, /publication-receipt JSON/);
  assert.match(html, /至少两个 analytics-snapshot JSON/);
  assert.match(html, /humanReview/);
  assert.match(html, /at least two real analytics snapshots are required/);
  assert.match(html, /snapshot timestamps must be distinct/);
});

test("feedback workbench preserves truth and authority boundaries", () => {
  assert.match(html, /causalClaimAllowed:false/);
  assert.match(html, /automaticContentMutationAllowed:false/);
  assert.match(html, /automaticRepublishingAllowed:false/);
  assert.match(html, /humanReviewRequired:true/);
  assert.match(html, /未知/);
  assert.doesNotMatch(html, /fetch\s*\(/);
  assert.doesNotMatch(html, /XMLHttpRequest/);
  assert.doesNotMatch(html, /localStorage/);
  assert.doesNotMatch(html, /sessionStorage/);
});

test("feedback workbench binds every snapshot to the real publication identity", () => {
  assert.match(html, /snapshot platform mismatch/);
  assert.match(html, /snapshot video id mismatch/);
  assert.match(html, /snapshot media digest mismatch/);
  assert.match(html, /snapshot predates publication/);
  assert.match(html, /publication receipt must be human confirmed/);
  assert.match(html, /analytics snapshot must be human confirmed/);
});
