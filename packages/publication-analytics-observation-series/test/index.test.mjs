import test from 'node:test';
import assert from 'node:assert/strict';
import { bindPublicationAnalyticsObservationSeries } from '../src/index.mjs';

function observation(overrides = {}) {
  return {
    status: 'ANALYTICS_OBSERVATION_BOUND',
    analyticsObserved: true,
    platform: 'bilibili',
    publicationReceiptDigest: 'receipt-1',
    platformVideoId: 'BV1real',
    observationDigest: 'observation-digest',
    observedAt: '2026-08-06T01:00:00.000Z',
    metrics: {
      views: 100,
      likes: 10,
      comments: 2,
      shares: 1,
      favorites: 3,
      followersGained: 1,
    },
    ...overrides,
  };
}

test('binds two chronological observations for the same publication', () => {
  const result = bindPublicationAnalyticsObservationSeries({
    boundObservations: [
      observation(),
      observation({
        observationDigest: 'observation-digest-2',
        observedAt: '2026-08-06T02:00:00.000Z',
        metrics: { views: 160, likes: 15, comments: 3, shares: 2, favorites: 5, followersGained: 2 },
      }),
    ],
  });

  assert.equal(result.status, 'ANALYTICS_OBSERVATION_SERIES_BOUND');
  assert.equal(result.feedbackReportAllowed, true);
  assert.equal(result.causalClaimsAllowed, false);
  assert.match(result.seriesDigest, /^[a-f0-9]{64}$/);
});

test('requires at least two real observations', () => {
  const result = bindPublicationAnalyticsObservationSeries({ boundObservations: [observation()] });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.feedbackReportAllowed, false);
});

test('blocks observations from different publication receipts', () => {
  const result = bindPublicationAnalyticsObservationSeries({
    boundObservations: [
      observation(),
      observation({ publicationReceiptDigest: 'receipt-2', observedAt: '2026-08-06T02:00:00.000Z' }),
    ],
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.includes('publication receipt digest mismatch')));
});

test('blocks non-chronological observations', () => {
  const result = bindPublicationAnalyticsObservationSeries({
    boundObservations: [observation(), observation({ observedAt: '2026-08-06T00:30:00.000Z' })],
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.includes('not later')));
});

test('blocks decreasing cumulative platform metrics', () => {
  const result = bindPublicationAnalyticsObservationSeries({
    boundObservations: [
      observation(),
      observation({
        observedAt: '2026-08-06T02:00:00.000Z',
        metrics: { views: 99, likes: 10, comments: 2, shares: 1, favorites: 3, followersGained: 1 },
      }),
    ],
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.includes('metric views decreased')));
});

test('series digest is deterministic', () => {
  const input = {
    boundObservations: [
      observation(),
      observation({ observedAt: '2026-08-06T02:00:00.000Z', observationDigest: 'observation-digest-2' }),
    ],
  };
  assert.equal(
    bindPublicationAnalyticsObservationSeries(input).seriesDigest,
    bindPublicationAnalyticsObservationSeries(input).seriesDigest,
  );
});
