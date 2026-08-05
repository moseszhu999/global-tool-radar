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

export function buildBoundedPublicationFeedbackSummary(input) {
  if (!input || typeof input !== 'object') throw new TypeError('input is required');
  const series = input.observationSeries;
  const reasons = [];

  if (series?.status !== 'ANALYTICS_OBSERVATION_SERIES_BOUND' || series?.feedbackReportAllowed !== true) {
    reasons.push('a bound analytics observation series is required');
  }
  if (!series?.seriesDigest || !/^[a-f0-9]{64}$/.test(series.seriesDigest)) {
    reasons.push('series digest is invalid');
  }
  if (!Array.isArray(series?.observations) || series.observations.length < 2) {
    reasons.push('at least two observations are required');
  }

  if (reasons.length > 0) {
    return { status: 'BLOCKED', reasons, feedbackSummaryReady: false };
  }

  const first = series.observations[0];
  const last = series.observations.at(-1);
  const firstAt = new Date(first.observedAt);
  const lastAt = new Date(last.observedAt);
  const elapsedMs = lastAt.getTime() - firstAt.getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return { status: 'BLOCKED', reasons: ['observation interval is invalid'], feedbackSummaryReady: false };
  }

  const delta = {};
  const perHour = {};
  for (const field of METRIC_FIELDS) {
    const start = first.metrics?.[field];
    const end = last.metrics?.[field];
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) {
      reasons.push(`metric ${field} is invalid or decreased`);
      continue;
    }
    delta[field] = end - start;
    perHour[field] = Number(((end - start) / (elapsedMs / 3_600_000)).toFixed(4));
  }

  if (reasons.length > 0) {
    return { status: 'BLOCKED', reasons, feedbackSummaryReady: false };
  }

  const core = {
    schema: 'toolradar.publication-bounded-feedback-summary.v1',
    platform: series.platform,
    platformVideoId: series.platformVideoId,
    publicationReceiptDigest: series.publicationReceiptDigest,
    seriesDigest: series.seriesDigest,
    observationCount: series.observations.length,
    firstObservedAt: firstAt.toISOString(),
    lastObservedAt: lastAt.toISOString(),
    elapsedHours: Number((elapsedMs / 3_600_000).toFixed(4)),
    firstMetrics: first.metrics,
    lastMetrics: last.metrics,
    metricDelta: delta,
    averageDeltaPerHour: perHour,
  };

  return {
    ...core,
    status: 'BOUNDED_FEEDBACK_SUMMARY_READY',
    summaryDigest: digest(core),
    feedbackSummaryReady: true,
    causalClaimsAllowed: false,
    recommendationClaimsAllowed: false,
    platformApiVerified: false,
    interpretation: 'descriptive-only',
  };
}
