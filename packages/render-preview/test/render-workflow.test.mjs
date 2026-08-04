import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../../../.github/workflows/render-preview.yml", import.meta.url),
  "utf8",
);
const renderer = await readFile(
  new URL("../../../apps/worker/src/render-preview-video.mjs", import.meta.url),
  "utf8",
);

test("render workflow produces and uploads a real MP4 preview artifact", () => {
  assert.match(workflow, /ffmpeg espeak-ng librsvg2-bin fonts-noto-cjk/);
  assert.match(workflow, /production:render-preview:replit/);
  assert.match(workflow, /build\/replit-design-preview\.mp4/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /publicationAllowed !== false/);
});

test("renderer generates only owned cards and visible placeholder frames", () => {
  assert.match(renderer, /自有录屏待替换/);
  assert.match(renderer, /本画面仅验证配音、字幕与剪辑流水线/);
  assert.match(renderer, /sourceVideoReuseAllowed/);
  assert.doesNotMatch(renderer, /youtube\.com\/watch/);
  assert.doesNotMatch(renderer, /ytimg\.com/);
});
