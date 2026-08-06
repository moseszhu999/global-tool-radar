import assert from 'node:assert/strict';
import test from 'node:test';
import {bindPublicationAnalyticsObservationSeries} from '../src/index.mjs';
import {validatePublicationAnalyticsObservationSeries} from '../src/validate.mjs';

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

test('validates a deterministic chronological observation series', () => {
  const series = bindPublicationAnalyticsObservationSeries({
    boundObservations: [
      observation('b', '2026-08-06T01:00:00.000Z', 100),
      observation('c', '2026-08-06T02:00:00.000Z', 160),
    ],
  });
  assert.equal(validatePublicationAnalyticsObservationSeries(series), true);
});

test('rejects a tampered observation series', () => {
  const series = bindPublicationAnalyticsObservationSeries({
    boundObservations: [
      observation('b', '2026-08-06T01:00:00.000Z', 100),
      observation('c', '2026-08-06T02:00:00.000Z', 160),
    ],
  });
  const tampered = structuredClone(series);
  tampered.observations[1].metrics.views = 161;
  assert.throws(() => validatePublicationAnalyticsObservationSeries(tampered), /digest mismatch/);
});
