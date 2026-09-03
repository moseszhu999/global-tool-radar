import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildRenderPreviewPackage,
  buildSrt,
  validateRenderPreviewPackage,
} from "../src/index.mjs";

const storyboardPath = new URL(
  "../../../apps/web/data/replit-design-storyboard-package.json",
  import.meta.url,
);
const storyboardPackage = JSON.parse(await readFile(storyboardPath, "utf8"));

const activeStoryboardPath = new URL(
  "../../../apps/web/data/ai-design-workflow-storyboard-package.json",
  import.meta.url,
);
const activeStoryboardPackage = JSON.parse(await readFile(activeStoryboardPath, "utf8"));

test("builds a contiguous 9:16 render preview from the real storyboard", () => {
  const preview = buildRenderPreviewPackage(storyboardPackage, {
    generatedAt: "2026-08-04T10:00:00.000Z",
  });
  assert.equal(validateRenderPreviewPackage(preview), true);
  assert.equal(preview.renderSlides.length, 7);
  assert.equal(preview.timelineDurationSeconds, 89);
  assert.equal(preview.format.aspectRatio, "9:16");
  assert.equal(preview.renderSlides.at(-1).endSecond, 89);
  assert.equal(preview.gates.previewRenderAllowed, true);
});

test("accepts the exact approved active timeline across harmless binary floating-point representation", () => {
  assert.equal(activeStoryboardPackage.storyboard.shots[1].durationSeconds, 15.412);
  assert.equal(
    activeStoryboardPackage.storyboard.shots[1].endSecond
      - activeStoryboardPackage.storyboard.shots[1].startSecond,
    15.411999999999999,
  );
  const preview = buildRenderPreviewPackage(activeStoryboardPackage, {
    generatedAt: "2026-08-28T09:38:00.000Z",
  });
  assert.equal(validateRenderPreviewPackage(preview), true);
  assert.equal(preview.subtitleCues.length, activeStoryboardPackage.storyboard.shots.length);
  assert.equal(preview.timelineDurationSeconds, activeStoryboardPackage.timelineDurationSeconds);
});

test("keeps unresolved owned recordings visible as non-publishable placeholders", () => {
  const preview = buildRenderPreviewPackage(storyboardPackage);
  assert.deepEqual(preview.placeholderSlideIds, [
    "render:shot:03",
    "render:shot:04",
    "render:shot:05",
  ]);
  assert.equal(preview.gates.finalRenderAllowed, false);
  assert.equal(preview.gates.publicationAllowed, false);
  assert.equal(preview.policy.sourceVideoDownloadAllowed, false);
  assert.equal(preview.policy.sourceVideoReuseAllowed, false);
  for (const slide of preview.renderSlides.filter((item) => item.placeholderRequired)) {
    assert.match(slide.previewLabel, /待替换/);
  }
});

test("creates subtitle cues covering every script segment", () => {
  const preview = buildRenderPreviewPackage(storyboardPackage);
  const srt = buildSrt(preview);
  assert.equal(preview.subtitleCues.length, 7);
  assert.match(srt, /00:00:00,000 --> 00:00:10,000/);
  assert.match(srt, /00:01:23,000 --> 00:01:29,000/);
  assert.match(srt, /Replit Design/);
});

test("rejects attempts to make preview output publishable", () => {
  const preview = buildRenderPreviewPackage(storyboardPackage);
  assert.throws(
    () => validateRenderPreviewPackage({
      ...preview,
      gates: { ...preview.gates, publicationAllowed: true },
    }),
    /must not be publishable/,
  );
});
