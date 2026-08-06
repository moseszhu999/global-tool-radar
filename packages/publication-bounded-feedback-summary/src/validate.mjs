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

const summaryCore = (summary) => ({
  schema: summary.schema,
  platform: summary.platform,
  platformVideoId: summary.platformVideoId,
  publicationReceiptDigest: summary.publicationReceiptDigest,
  seriesDigest: summary.seriesDigest,
  observationCount: summary.observationCount,
  firstObservedAt: summary.firstObservedAt,
  lastObservedAt: summary.lastObservedAt,
  elapsedHours: summary.elapsedHours,
  firstMetrics: summary.firstMetrics,
  lastMetrics: summary.lastMetrics,
  metricDelta: summary.metricDelta,
  averageDeltaPerHour: summary.averageDeltaPerHour,
});

export function validateBoundedPublicationFeedbackSummary(summary) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) throw new TypeError('summary must be an object');
  if (summary.schema !== 'toolradar.publication-bounded-feedback-summary.v1') {
    throw new Error('unsupported bounded feedback summary schema');
  }
  if (summary.status !== 'BOUNDED_FEEDBACK_SUMMARY_READY') throw new Error('bounded feedback summary is not ready');
  if (!SHA256.test(summary.publicationReceiptDigest ?? '') || !SHA256.test(summary.seriesDigest ?? '')) {
    throw new Error('bounded feedback evidence digest is invalid');
  }
  if (!Number.isInteger(summary.observationCount) || summary.observationCount < 2) {
    throw new Error('bounded feedback observation count is invalid');
  }
  const firstAt = new Date(summary.firstObservedAt);
  const lastAt = new Date(summary.lastObservedAt);
  if (Number.isNaN(firstAt.getTime()) || Number.isNaN(lastAt.getTime()) || lastAt <= firstAt) {
    throw new Error('bounded feedback interval is invalid');
  }
  if (!Number.isFinite(summary.elapsedHours) || summary.elapsedHours <= 0) {
    throw new Error('bounded feedback elapsed hours are invalid');
  }
  for (const field of METRIC_FIELDS) {
    const first = summary.firstMetrics?.[field];
    const last = summary.lastMetrics?.[field];
    const delta = summary.metricDelta?.[field];
    const perHour = summary.averageDeltaPerHour?.[field];
    if (!Number.isInteger(first) || !Number.isInteger(last) || first < 0 || last < first) {
      throw new Error(`bounded feedback metric ${field} is invalid`);
    }
    if (delta !== last - first || !Number.isFinite(perHour) || perHour < 0) {
      throw new Error(`bounded feedback derived metric ${field} is invalid`);
    }
  }
  if (!SHA256.test(summary.summaryDigest ?? '') || digest(summaryCore(summary)) !== summary.summaryDigest) {
    throw new Error('bounded feedback summary digest mismatch');
  }
  if (summary.feedbackSummaryReady !== true
    || summary.causalClaimsAllowed !== false
    || summary.recommendationClaimsAllowed !== false
    || summary.platformApiVerified !== false
    || summary.interpretation !== 'descriptive-only') {
    throw new Error('bounded feedback truth boundary is invalid');
  }
  return true;
}
