import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = new URL("../../../apps/web/publication-receipt-workbench.html", import.meta.url);

test("publication receipt workbench stays local and truth-bound", async () => {
  const html = await readFile(htmlPath, "utf8");
  assert.match(html, /真实发布回执工作台/);
  assert.match(html, /13a72f8139040d15956c1cbc74d45f0193a7eb9269bbeec2e3a6292cddf87f1c/);
  assert.match(html, /operatorConfirmed/);
  assert.match(html, /platformVideoId/);
  assert.match(html, /canonicalUrl/);
  assert.match(html, /publishedAt/);
  assert.match(html, /capturedAt/);
  assert.match(html, /new Blob/);
  assert.doesNotMatch(html, /fetch\s*\(/);
  assert.doesNotMatch(html, /XMLHttpRequest/);
  assert.doesNotMatch(html, /localStorage/);
  assert.doesNotMatch(html, /sessionStorage/);
  assert.doesNotMatch(html, /client_secret|access_token|refresh_token/i);
});

test("workbench cannot export without explicit operator confirmation", async () => {
  const html = await readFile(htmlPath, "utf8");
  assert.match(html, /if\(!r\.operatorConfirmed\)errors\.push/);
  assert.match(html, /download.*disabled/);
  assert.match(html, /errors\.length\?null:r/);
});
