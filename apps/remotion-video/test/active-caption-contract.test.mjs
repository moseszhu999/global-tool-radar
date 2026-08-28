import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  buildRenderPreviewPackage,
  buildSrt,
  validateRenderPreviewPackage,
} from '../../../packages/render-preview/src/index.mjs';

const storyboard = JSON.parse(
  readFileSync(
    new URL('../../web/data/ai-design-workflow-storyboard-package.json', import.meta.url),
    'utf8',
  ),
);

const normalizeTechnicalDurations = (value) => ({
  ...value,
  storyboard: {
    ...value.storyboard,
    shots: value.storyboard.shots.map((shot) => ({
      ...shot,
      durationSeconds: shot.endSecond - shot.startSecond,
    })),
  },
});

const normalizedStoryboard = normalizeTechnicalDurations(storyboard);
const renderPackage = buildRenderPreviewPackage(normalizedStoryboard, {
  generatedAt: '2026-08-28T08:38:00.000Z',
});
const srt = buildSrt(renderPackage);

test('exact approved storyboard currently exposes a Shared Media floating-point strict-equality blocker', () => {
  assert.equal(storyboard.storyboard.shots[1].durationSeconds, 15.412);
  assert.equal(storyboard.storyboard.shots[1].endSecond - storyboard.storyboard.shots[1].startSecond, 15.411999999999999);
  assert.throws(
    () => buildRenderPreviewPackage(storyboard, {generatedAt: '2026-08-28T08:38:00.000Z'}),
    /shot:02 must form a contiguous timeline/,
  );
});

test('the existing Shared Media caption contract accepts the same approved timing after technical duration normalization only', () => {
  assert.equal(validateRenderPreviewPackage(renderPackage), true);
  assert.equal(renderPackage.sourceStoryboardPackageId, storyboard.packageId);
  assert.equal(renderPackage.timelineDurationSeconds, storyboard.timelineDurationSeconds);
  assert.equal(renderPackage.subtitleCues.length, storyboard.storyboard.shots.length);
  assert.equal(renderPackage.placeholderSlideIds.length, 0);
  assert.equal(renderPackage.gates.finalRenderAllowed, true);
  assert.equal(renderPackage.gates.publicationAllowed, false);
});

test('normalized caption cues remain bound to the exact approved start/end timing and narration text', () => {
  for (const [index, shot] of storyboard.storyboard.shots.entries()) {
    const cue = renderPackage.subtitleCues[index];
    assert.equal(cue.index, index + 1);
    assert.equal(cue.startSecond, shot.startSecond);
    assert.equal(cue.endSecond, shot.endSecond);
    assert.equal(cue.text, shot.narrationText);
  }

  assert.equal(renderPackage.subtitleCues[0].startSecond, 0);
  assert.equal(renderPackage.subtitleCues.at(-1).endSecond, storyboard.timelineDurationSeconds);
});

test('derived SRT is deterministic, complete, and remains a non-publication evidence artifact', () => {
  const blocks = srt.trim().split('\n\n');
  assert.equal(blocks.length, storyboard.storyboard.shots.length);
  assert.match(blocks[0], /^1\n00:00:00,000 --> /);
  assert.match(blocks.at(-1), new RegExp(`${storyboard.storyboard.shots.length}\\n`));
  assert.doesNotMatch(srt, /自有录屏待替换/);
  assert.equal(renderPackage.policy.automaticPublishingAllowed, false);
});
