import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../../', import.meta.url);
const html = await readFile(new URL('apps/web/index.html', root), 'utf8');
const script = await readFile(new URL('apps/web/today.mjs', root), 'utf8');
const brief = JSON.parse(await readFile(new URL('apps/web/data/today-brief.json', root), 'utf8'));

test('owner dashboard publishes the confirmed third capture', () => {
  assert.equal(brief.capture.channels, 11);
  assert.equal(brief.capture.videos, 165);
  assert.equal(brief.capture.measurementPoints, 495);
  assert.equal(brief.capture.intervalHours, 6.455);
  assert.equal(brief.capture.promotionGate, 'MOMENTUM_CONFIRMED');
  assert.equal(brief.capture.videosWithConfirmedPositiveGrowth, 145);
  assert.equal(brief.sourceEvidence.captureRunId, '30824192519');
});

test('default page is a repository-native dashboard rather than a Replit dependency', () => {
  assert.match(html, /哪些正在变热/);
  assert.match(html, /仓库原生代码/);
  assert.doesNotMatch(html, /href="\.\/replit-test\.html"/);
  assert.match(html, /Nothing to preview yet/);
});

test('dates and metrics are rendered only from the evidence brief', () => {
  assert.match(html, /data-report-date/);
  assert.match(html, /data-generated/);
  assert.match(script, /dateOnly\(capture\.latestCapturedAt\)/);
  assert.match(script, /videosWithConfirmedPositiveGrowth/);
  assert.doesNotMatch(html, /2025年/);
  assert.doesNotMatch(html, /09:42 UTC/);
});

test('country and adoption claims remain explicitly bounded', () => {
  assert.match(html, /不能回答观众来自哪个国家/);
  assert.match(html, /不能直接证明产品注册量、付费量或真实采用/);
  assert.equal(brief.policy.momentumIsFinalDecision, false);
  assert.equal(brief.policy.automaticPublishingAllowed, false);
});
