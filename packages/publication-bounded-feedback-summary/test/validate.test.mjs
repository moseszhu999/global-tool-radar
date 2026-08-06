import assert from 'node:assert/strict';
import test from 'node:test';
import {bindPublicationAnalyticsObservationSeries} from '../../publication-analytics-observation-series/src/index.mjs';
import {buildBoundedPublicationFeedbackSummary} from '../src/index.mjs';
import {validateBoundedPublicationFeedbackSummary} from '../src/validate.mjs';

const observation = (character, observedAt, views) => ({
  status: 'ANALYTICS_OBSERVATION_BOUND',
  analyticsObserved: true,
  platform: 'bilibili',
  publicationReceiptDigest: 'a'.repeat(64),
  platformVideoId: 'BV1real',
  observationDigest: character.repeat(64),
  observedAt,
  metrics: {
    views,
    likes: Math.floor(views / 10),
    comments: Math.floor(views / 50),
    shares: Math.floor(views / 100),
    favorites: Math.floor(views / 40),
    followersGained: Math.floor(views / 100),
  },
});

const buildSummary = () => buildBoundedPublicationFeedbackSummary({
  observationSeries: bindPublicationAnalyticsObservationSeries({
    boundObservations: [
      observation('b', '2026-08-06T01:00:00.000Z', 100),
      observation('c', '2026-08-06T03:00:00.000Z', 200),
    ],
  }),
});

test('validates a descriptive-only bounded feedback summary', () => {
  const summary = buildSummary();
  assert.equal(validateBoundedPublicationFeedbackSummary(summary), true);
  assert.equal(summary.metricDelta.views, 100);
  assert.equal(summary.averageDeltaPerHour.views, 50);
  assert.equal(summary.causalClaimsAllowed, false);
  assert.equal(summary.recommendationClaimsAllowed, false);
});

test('rejects a tampered bounded feedback summary', () => {
  const summary = buildSummary();
  assert.throws(
    () => validateBoundedPublicationFeedbackSummary({...summary, metricDelta: {...summary.metricDelta, views: 101}}),
    /derived metric|digest mismatch/,
  );
});
