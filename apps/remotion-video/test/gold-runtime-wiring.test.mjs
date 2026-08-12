import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const worker = readFileSync(new URL('../../worker/src/run-video-quality-gate.mjs', import.meta.url), 'utf8');

test('worker exposes the optional creative-quality evidence input', () => {
  assert.match(worker, /--creative-quality/);
  assert.match(worker, /creativeQualityPath/);
  assert.match(worker, /creativeQualityEvidence/);
});

test('worker passes creative-quality evidence into the canonical quality report builder', () => {
  assert.match(
    worker,
    /buildVideoQualityReport\(\{[\s\S]*creativeQualityEvidence,[\s\S]*generatedAt[\s\S]*\}\)/,
  );
});

test('worker continues to support the legacy path when no creative-quality file is supplied', () => {
  assert.match(worker, /creativeQualityArg \? resolve\(creativeQualityArg\) : null/);
  assert.match(worker, /creativeQualityPath \? readFile\(creativeQualityPath,[\s\S]*: Promise\.resolve\(null\)/);
});

test('worker exposes the selected quality profile in its operator receipt', () => {
  assert.match(worker, /qualityProfile: report\.qualityProfile/);
});
