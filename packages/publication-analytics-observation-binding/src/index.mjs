import { createHash } from 'node:crypto';

const SUPPORTED_PLATFORMS = new Set(['douyin', 'bilibili']);
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

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
}

function nonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return value;
}

export function bindPublicationAnalyticsObservation(input) {
  if (!input || typeof input !== 'object') throw new TypeError('input is required');

  const publication = input.boundPublicationReceipt;
  if (!publication || publication.status !== 'PUBLICATION_CONFIRMED' || publication.analyticsIntakeAllowed !== true) {
    return {
      status: 'BLOCKED',
      reasons: ['bound publication receipt is not eligible for analytics intake'],
      analyticsObserved: false,
      feedbackReportAllowed: false,
    };
  }

  const observation = input.analyticsObservation ?? {};
  const reasons = [];
  const platform = requiredText(observation.platform, 'analyticsObservation.platform').toLowerCase();
  if (!SUPPORTED_PLATFORMS.has(platform)) throw new RangeError(`unsupported platform: ${platform}`);
  if (platform !== publication.platform) reasons.push('platform does not match bound publication receipt');

  const receiptDigest = requiredText(observation.publicationReceiptDigest, 'analyticsObservation.publicationReceiptDigest');
  if (receiptDigest !== publication.receiptDigest) reasons.push('publication receipt digest mismatch');

  const platformVideoId = requiredText(observation.platformVideoId, 'analyticsObservation.platformVideoId');
  if (platformVideoId !== publication.platformVideoId) reasons.push('platform video ID mismatch');

  const observedAt = new Date(requiredText(observation.observedAt, 'analyticsObservation.observedAt'));
  const publishedAt = new Date(publication.publishedAt);
  if (Number.isNaN(observedAt.getTime())) reasons.push('invalid observation timestamp');
  if (!Number.isNaN(observedAt.getTime()) && !Number.isNaN(publishedAt.getTime()) && observedAt < publishedAt) {
    reasons.push('observation timestamp precedes publication timestamp');
  }

  if (observation.operatorConfirmedMetrics !== true) reasons.push('human metric confirmation is required');
  if (observation.source !== 'platform-ui-manual') reasons.push('source must be platform-ui-manual');

  const metrics = {};
  for (const field of METRIC_FIELDS) {
    metrics[field] = nonNegativeInteger(observation.metrics?.[field], `analyticsObservation.metrics.${field}`);
  }

  if (reasons.length > 0) {
    return {
      status: 'BLOCKED',
      reasons,
      analyticsObserved: false,
      feedbackReportAllowed: false,
    };
  }

  const core = {
    schema: 'toolradar.bound-publication-analytics-observation.v1',
    platform,
    publicationReceiptDigest: receiptDigest,
    platformVideoId,
    observedAt: observedAt.toISOString(),
    source: observation.source,
    operator: requiredText(observation.operator, 'analyticsObservation.operator'),
    metrics,
  };

  return {
    ...core,
    status: 'ANALYTICS_OBSERVATION_BOUND',
    observationDigest: digest(core),
    analyticsObserved: true,
    feedbackReportAllowed: true,
    platformApiVerified: false,
    metricsAreSelfReportedFromPlatformUi: true,
  };
}
