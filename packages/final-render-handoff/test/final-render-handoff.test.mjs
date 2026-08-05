import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFinalRenderHandoff, validateFinalRenderHandoff } from '../src/index.mjs';

const sha = 'a'.repeat(64);
const intakeReceipt = {
  schemaVersion: 'toolradar.owned-media-intake-receipt.v1',
  receiptId: 'replit-design:owned-media-intake:v1',
  projectId: 'replit-design',
  capturedAt: '2026-08-05T01:00:00.000Z',
  decision: 'READY_FOR_FINAL_RENDER',
  finalRenderAllowed: true,
  publicationAllowed: false,
  blockers: [],
  clips: [
    ['replit_prompt_to_build', 'prompt.mp4', 8],
    ['replit_live_preview', 'preview.mp4', 9],
    ['replit_iteration_result', 'result.mp4', 10],
  ].map(([shotId, localFilename, durationSeconds]) => ({ shotId, localFilename, durationSeconds, sha256: sha, valid: true })),
  voice: { localFilename: 'voice.wav', sha256: sha, valid: true, approved: true, ownedOrLicensed: true },
};
const timelineSlots = [
  { shotId: 'replit_prompt_to_build', startSeconds: 12, endSeconds: 20 },
  { shotId: 'replit_live_preview', startSeconds: 20, endSeconds: 29 },
  { shotId: 'replit_iteration_result', startSeconds: 29, endSeconds: 39 },
];

test('builds a source-bound render handoff for all three shots', () => {
  const handoff = buildFinalRenderHandoff({ intakeReceipt, timelineSlots, outputFilename: 'replit-design-final.mp4' });
  assert.equal(handoff.replacements.length, 3);
  assert.equal(handoff.renderExecutionAllowed, true);
  assert.equal(handoff.humanReviewRequiredAfterRender, true);
  assert.equal(handoff.publicationAllowed, false);
  assert.equal(validateFinalRenderHandoff(handoff), true);
});

test('rejects a blocked or non-render-ready intake receipt', () => {
  assert.throws(() => buildFinalRenderHandoff({
    intakeReceipt: { ...intakeReceipt, decision: 'BLOCKED', finalRenderAllowed: false },
    timelineSlots,
    outputFilename: 'final.mp4',
  }), /render-ready intake receipt/);
});

test('rejects incomplete timeline replacement coverage', () => {
  assert.throws(() => buildFinalRenderHandoff({
    intakeReceipt,
    timelineSlots: timelineSlots.slice(0, 2),
    outputFilename: 'final.mp4',
  }), /invalid timeline slot/);
});

test('never authorizes publication and always requires post-render review', () => {
  const handoff = buildFinalRenderHandoff({ intakeReceipt, timelineSlots, outputFilename: 'final.mp4' });
  assert.equal(handoff.publicationAllowed, false);
  assert.equal(handoff.humanReviewRequiredAfterRender, true);
});
