import test from 'node:test';
import assert from 'node:assert/strict';
import { bindPublicationAnalyticsObservation } from '../src/index.mjs';

const receipt = {
  status: 'PUBLICATION_CONFIRMED', analyticsIntakeAllowed: true,
  platform: 'bilibili', receiptDigest: 'a'.repeat(64), platformVideoId: 'BV1test',
  publishedAt: '2026-08-06T00:00:00.000Z',
};

const observation = {
  platform: 'bilibili', publicationReceiptDigest: 'a'.repeat(64), platformVideoId: 'BV1test',
  observedAt: '2026-08-06T06:00:00.000Z', source: 'platform-ui-manual',
  operator: 'authorized-operator', operatorConfirmedMetrics: true,
  metrics: { views: 100, likes: 10, comments: 2, shares: 1, favorites: 3, followersGained: 1 },
};

test('binds a human-confirmed analytics observation to the exact publication receipt', () => {
  const result = bindPublicationAnalyticsObservation({ boundPublicationReceipt: receipt, analyticsObservation: observation });
  assert.equal(result.status, 'ANALYTICS_OBSERVATION_BOUND');
  assert.equal(result.analyticsObserved, true);
  assert.equal(result.feedbackReportAllowed, true);
  assert.equal(result.platformApiVerified, false);
  assert.equal(result.metrics.views, 100);
  assert.match(result.observationDigest, /^[a-f0-9]{64}$/);
});

test('blocks when publication receipt is not confirmed', () => {
  const result = bindPublicationAnalyticsObservation({ boundPublicationReceipt: { status: 'BLOCKED' }, analyticsObservation: observation });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.analyticsObserved, false);
});

test('blocks a digest mismatch without inventing metrics', () => {
  const result = bindPublicationAnalyticsObservation({
    boundPublicationReceipt: receipt,
    analyticsObservation: { ...observation, publicationReceiptDigest: 'b'.repeat(64) },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.reasons, ['publication receipt digest mismatch']);
});

test('rejects negative or fractional metric values', () => {
  assert.throws(() => bindPublicationAnalyticsObservation({
    boundPublicationReceipt: receipt,
    analyticsObservation: { ...observation, metrics: { ...observation.metrics, views: -1 } },
  }), /non-negative integer/);
});

test('is deterministic for identical evidence', () => {
  const first = bindPublicationAnalyticsObservation({ boundPublicationReceipt: receipt, analyticsObservation: observation });
  const second = bindPublicationAnalyticsObservation({ boundPublicationReceipt: receipt, analyticsObservation: observation });
  assert.equal(first.observationDigest, second.observationDigest);
});
