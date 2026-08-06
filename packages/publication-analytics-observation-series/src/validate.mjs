import {createHash} from 'node:crypto';

const METRIC_FIELDS = ['views', 'likes', 'comments', 'shares', 'favorites', 'followersGained'];
const SHA256 = /^[a-f0-9]{64}$/;

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const digest = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');

const seriesCore = (series) => ({
  schema: series.schema,
  platform: series.platform,
  publicationReceiptDigest: series.publicationReceiptDigest,
  platformVideoId: series.platformVideoId,
  observations: series.observations,
});

export function validatePublicationAnalyticsObservationSeries(series) {
  if (!series || typeof series !== 'object' || Array.isArray(series)) throw new TypeError('series must be an object');
  if (series.schema !== 'toolradar.publication-analytics-observation-series.v1') {
    throw new Error('unsupported analytics observation series schema');
  }
  if (series.status !== 'ANALYTICS_OBSERVATION_SERIES_BOUND') throw new Error('analytics observation series is not bound');
  if (!SHA256.test(series.publicationReceiptDigest ?? '')) throw new Error('publication receipt digest is invalid');
  if (!Array.isArray(series.observations) || series.observations.length < 2) throw new Error('at least two observations are required');

  let previousAt = null;
  let previousMetrics = null;
  for (const [index, observation] of series.observations.entries()) {
    if (!SHA256.test(observation?.observationDigest ?? '')) throw new Error(`observation ${index} digest is invalid`);
    const observedAt = new Date(observation?.observedAt);
    if (Number.isNaN(observedAt.getTime())) throw new Error(`observation ${index} timestamp is invalid`);
    if (previousAt && observedAt <= previousAt) throw new Error(`observation ${index} is not chronological`);
    for (const field of METRIC_FIELDS) {
      const value = observation?.metrics?.[field];
      if (!Number.isInteger(value) || value < 0) throw new Error(`observation ${index} metric ${field} is invalid`);
      if (previousMetrics && value < previousMetrics[field]) throw new Error(`observation ${index} metric ${field} decreased`);
    }
    previousAt = observedAt;
    previousMetrics = observation.metrics;
  }

  if (!SHA256.test(series.seriesDigest ?? '') || digest(seriesCore(series)) !== series.seriesDigest) {
    throw new Error('analytics observation series digest mismatch');
  }
  if (series.feedbackReportAllowed !== true
    || series.causalClaimsAllowed !== false
    || series.platformApiVerified !== false) {
    throw new Error('analytics observation series truth boundary is invalid');
  }
  return true;
}
