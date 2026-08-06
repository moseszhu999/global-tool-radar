import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root = readFileSync(new URL('../src/root.tsx', import.meta.url), 'utf8');
const video = readFileSync(new URL('../src/tool-radar-video.tsx', import.meta.url), 'utf8');
const preview = JSON.parse(readFileSync(new URL('../props/preview.json', import.meta.url), 'utf8'));
const finalProps = JSON.parse(readFileSync(new URL('../props/final.json', import.meta.url), 'utf8'));

test('uses the canonical 89-second 9:16 composition', () => {
  assert.match(root, /durationInFrames=\{2670\}/);
  assert.match(root, /fps=\{30\}/);
  assert.match(root, /width=\{1080\}/);
  assert.match(root, /height=\{1920\}/);
});

test('timeline covers all seven storyboard scenes without gaps', () => {
  const ranges = [...video.matchAll(/from: (\d+), duration: (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.equal(ranges.length, 7);
  let cursor = 0;
  for (const [from, duration] of ranges) {
    assert.equal(from, cursor);
    cursor += duration;
  }
  assert.equal(cursor, 2670);
});

test('preview cannot masquerade as a verified final video', () => {
  assert.equal(preview.designRecordingVerified, false);
  assert.equal(preview.buildLimitRecordingVerified, false);
  assert.equal(preview.voiceoverVerified, false);
  assert.match(video, /真实录屏待替换/);
  assert.match(video, /当前仅可作为静音预览/);
});

test('final render contract requires every owned media input to be verified', () => {
  assert.equal(finalProps.designRecordingVerified, true);
  assert.equal(finalProps.buildLimitRecordingVerified, true);
  assert.equal(finalProps.voiceoverVerified, true);
  assert.match(finalProps.designRecording, /owned-recording\.mp4$/);
  assert.match(finalProps.buildLimitRecording, /owned-recording\.mp4$/);
});

test('composition preserves the evidence boundary in visible copy', () => {
  assert.match(video, /关注增长 ≠ 产品普及/);
  assert.match(video, /生产交付未证明/);
  assert.match(video, /不使用第三方演示素材/);
});
