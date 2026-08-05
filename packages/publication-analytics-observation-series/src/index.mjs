import { createHash } from 'node:crypto';

const METRIC_FIELDS = ['views', 'likes', 'comments', 'shares', 'favorites', 'followersGained'];

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function bindPublicationAnalyticsObservationSeries(input) {
  if (!input || typeof input !== 'object') throw new TypeError('input is required');
  const observations = input.boundObservations;
  if (!Array.isArray(observations) || observations.length < 2) {
    return {
      status: 'BLOCKED',
      reasons: ['at least two bound analytics observations are required'],
      feedbackReportAllowed: false,
    };
  }

  const reasons = [];
  const first = observations[0];
  const publicationReceiptDigest = first?.publicationReceiptDigest;
  const platformVideoId = first?.platformVideoId;
  const platform = first?.platform;

  let previousObservedAt = null;
  const normalized = observations.map((observation, index) => {
    if (observation?.status !== 'ANALYTICS_OBSERVATION_BOUND' || observation?.analyticsObserved !== true) {
      reasons.push(`observation ${index} is not a bound analytics observation`);
    }
    if (observation?.publicationReceiptDigest !== publicationReceiptDigest) {
      reasons.push(`observation ${index} publication receipt digest mismatch`);
    }
    if (observation?.platformVideoId !== platformVideoId || observation?.platform !== platform) {
      reasons.push(`observation ${index} platform identity mismatch`);
    }

    const observedAt = new Date(observation?.observedAt);
    if (Number.isNaN(observedAt.getTime())) {
      reasons.push(`observation ${index} timestamp is invalid`);
    } else if (previousObservedAt && observedAt <= previousObservedAt) {
      reasons.push(`observation ${index} is not later than the previous observation`);
    }
    if (!Number.isNaN(observedAt.getTime())) previousObservedAt = observedAt;

    const metrics = {};
    for (const field of METRIC_FIELDS) {
      const value = observation?.metrics?.[field];
      if (!Number.isInteger(value) || value < 0) reasons.push(`observation ${index} metric ${field} is invalid`);
      metrics[field] = value;
    }

    return {
      observationDigest: observation?.observationDigest,
      observedAt: Number.isNaN(observedAt.getTime()) ? observation?.observedAt : observedAt.toISOString(),
      metrics,
    };
  });

  for (let index = 1; index < normalized.length; index += 1) {
    for (const field of METRIC_FIELDS) {
      if (normalized[index].metrics[field] < normalized[index - 1].metrics[field]) {
        reasons.push(`observation ${index} metric ${field} decreased`);
      }
    }
  }

  if (reasons.length > 0) {
    return {
      status: 'BLOCKED',
      reasons: [...new Set(reasons)],
      feedbackReportAllowed: false,
    };
  }

  const core = {
    schema: 'toolradar.publication-analytics-observation-series.v1',
    platform,
    publicationReceiptDigest,
    platformVideoId,
    observations: normalized,
  };

  return {
    ...core,
    status: 'ANALYTICS_OBSERVATION_SERIES_BOUND',
    seriesDigest: digest(core),
    feedbackReportAllowed: true,
    causalClaimsAllowed: false,
    platformApiVerified: false,
  };
}
