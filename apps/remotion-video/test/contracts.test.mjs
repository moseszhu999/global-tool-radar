import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root = readFileSync(new URL('../src/root.tsx', import.meta.url), 'utf8');
const video = readFileSync(new URL('../src/tool-radar-video.tsx', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const preview = JSON.parse(readFileSync(new URL('../props/preview.json', import.meta.url), 'utf8'));
const finalProps = JSON.parse(readFileSync(new URL('../props/final.json', import.meta.url), 'utf8'));

test('uses the canonical 89-second 9:16 self-owned composition', () => {
  assert.match(root, /id="ToolRadarAIDesignPortrait"/);
  assert.match(root, /durationInFrames=\{2670\}/);
  assert.match(root, /fps=\{30\}/);
  assert.match(root, /width=\{1080\}/);
  assert.match(root, /height=\{1920\}/);
});

test('timeline covers all seven generated scenes without gaps', () => {
  const ranges = [...video.matchAll(/from: (\d+), duration: (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.equal(ranges.length, 7);
  let cursor = 0;
  for (const [from, duration] of ranges) {
    assert.equal(from, cursor);
    cursor += duration;
  }
  assert.equal(cursor, 2670);
});

test('active composition has no external-recording or third-party product dependency', () => {
  const active = [root, video, JSON.stringify(preview), JSON.stringify(finalProps), JSON.stringify(packageJson)].join('\n');
  assert.doesNotMatch(active, /Replit/i);
  assert.doesNotMatch(active, /designRecording|buildLimitRecording|owned-recording/i);
  assert.doesNotMatch(video, /<Video|\bVideo\b/);
  assert.match(video, /自有代码生成画面/);
});

test('preview remains visual-only until the generated voiceover exists', () => {
  assert.equal(preview.voiceoverReady, false);
  assert.match(video, /配音待生成 · 当前为视觉预览/);
});

test('final render contract requires only the generated voiceover asset', () => {
  assert.equal(finalProps.voiceoverReady, true);
  assert.equal(finalProps.voiceover, 'assets/toolradar-ai-design-voiceover.wav');
  assert.equal(Object.keys(finalProps).sort().join(','), 'subtitle,title,voiceover,voiceoverReady');
});

test('render scripts point only at the new AI design composition and output names', () => {
  assert.match(packageJson.scripts['render:preview'], /ToolRadarAIDesignPortrait/);
  assert.match(packageJson.scripts['render:preview'], /toolradar-ai-design-preview\.mp4/);
  assert.match(packageJson.scripts['render:final'], /ToolRadarAIDesignPortrait/);
  assert.match(packageJson.scripts['render:final'], /toolradar-ai-design-final\.mp4/);
});

test('visible copy keeps the production truth boundary', () => {
  assert.match(video, /AI 加速的是探索，不是免审上线/);
  assert.match(video, /生产交付仍然要经过工程和人工质检/);
  assert.match(video, /无第三方演示素材/);
});
