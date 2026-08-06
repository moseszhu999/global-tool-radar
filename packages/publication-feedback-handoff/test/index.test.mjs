import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicationFeedbackHandoff } from '../src/index.mjs';

const summary = {
  summaryDigest: 'a'.repeat(64),
  feedbackSummaryReady: true,
  interpretation: 'descriptive-only',
  causalClaimsAllowed: false,
  recommendationClaimsAllowed: false,
  metricDeltas: { views: 120, likes: 8, comments: 2, shares: 1, favorites: 3, followers: 1 },
};

test('builds a deterministic human review handoff', () => {
  const input = { summary, owner: 'video-ops', reviewDueAt: '2026-08-07T00:00:00Z', notes: ['Check title fit'] };
  const first = buildPublicationFeedbackHandoff(input);
  const second = buildPublicationFeedbackHandoff(input);
  assert.deepEqual(first, second);
  assert.equal(first.handoffReady, true);
  assert.equal(first.decisionBoundary.humanReviewRequired, true);
  assert.equal(first.decisionBoundary.automaticContentChangeAllowed, false);
  assert.match(first.handoffDigest, /^[a-f0-9]{64}$/);
});

test('rejects a summary that is not ready', () => {
  assert.throws(() => buildPublicationFeedbackHandoff({ summary: { ...summary, feedbackSummaryReady: false }, owner: 'ops', reviewDueAt: '2026-08-07T00:00:00Z' }), /must be ready/);
});

test('rejects causal or recommendation-enabled summaries', () => {
  assert.throws(() => buildPublicationFeedbackHandoff({ summary: { ...summary, causalClaimsAllowed: true }, owner: 'ops', reviewDueAt: '2026-08-07T00:00:00Z' }), /must remain disabled/);
});

test('rejects invalid cumulative deltas', () => {
  assert.throws(() => buildPublicationFeedbackHandoff({ summary: { ...summary, metricDeltas: { ...summary.metricDeltas, views: -1 } }, owner: 'ops', reviewDueAt: '2026-08-07T00:00:00Z' }), /non-negative integer/);
});

test('rejects invalid review ownership and due time', () => {
  assert.throws(() => buildPublicationFeedbackHandoff({ summary, owner: '', reviewDueAt: '2026-08-07T00:00:00Z' }), /owner is required/);
  assert.throws(() => buildPublicationFeedbackHandoff({ summary, owner: 'ops', reviewDueAt: 'not-a-date' }), /ISO timestamp/);
});
