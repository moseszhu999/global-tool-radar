import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoundedPublicationFeedbackSummary } from '../src/index.mjs';

function series(overrides = {}) {
  return {
    status: 'ANALYTICS_OBSERVATION_SERIES_BOUND',
    feedbackReportAllowed: true,
    platform: 'bilibili',
    platformVideoId: 'BV1real',
    publicationReceiptDigest: 'receipt-digest',
    seriesDigest: 'a'.repeat(64),
    observations: [
      { observedAt: '2026-08-06T01:00:00.000Z', metrics: { views: 100, likes: 10, comments: 2, shares: 1, favorites: 3, followersGained: 1 } },
      { observedAt: '2026-08-06T03:00:00.000Z', metrics: { views: 180, likes: 18, comments: 4, shares: 3, favorites: 7, followersGained: 3 } },
    ],
    ...overrides,
  };
}

test('builds descriptive deltas from a bound observation series', () => {
  const result = buildBoundedPublicationFeedbackSummary({ observationSeries: series() });
  assert.equal(result.status, 'BOUNDED_FEEDBACK_SUMMARY_READY');
  assert.equal(result.metricDelta.views, 80);
  assert.equal(result.averageDeltaPerHour.views, 40);
  assert.equal(result.causalClaimsAllowed, false);
  assert.equal(result.recommendationClaimsAllowed, false);
  assert.equal(result.interpretation, 'descriptive-only');
  assert.match(result.summaryDigest, /^[a-f0-9]{64}$/);
});

test('blocks an unbound observation series', () => {
  const result = buildBoundedPublicationFeedbackSummary({ observationSeries: series({ feedbackReportAllowed: false }) });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.feedbackSummaryReady, false);
});

test('blocks an invalid series digest', () => {
  const result = buildBoundedPublicationFeedbackSummary({ observationSeries: series({ seriesDigest: 'not-a-digest' }) });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.includes('series digest')));
});

test('blocks a non-positive observation interval', () => {
  const input = series();
  input.observations[1].observedAt = input.observations[0].observedAt;
  const result = buildBoundedPublicationFeedbackSummary({ observationSeries: input });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.includes('interval')));
});

test('blocks decreasing cumulative metrics', () => {
  const input = series();
  input.observations[1].metrics.views = 99;
  const result = buildBoundedPublicationFeedbackSummary({ observationSeries: input });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.includes('views')));
});

test('summary digest is deterministic', () => {
  const input = { observationSeries: series() };
  assert.equal(
    buildBoundedPublicationFeedbackSummary(input).summaryDigest,
    buildBoundedPublicationFeedbackSummary(input).summaryDigest,
  );
});
