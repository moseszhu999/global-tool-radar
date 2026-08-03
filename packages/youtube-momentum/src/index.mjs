import { deriveMetricVelocity } from "../../source-records/src/index.mjs";
import { weightedScore } from "../../scoring/src/index.mjs";

const round = (value) => Math.round(value * 100) / 100;
const METRIC_REQUIRED = "METRIC_CONFIRMATION_REQUIRED";
const MOMENTUM_CONFIRMED = "MOMENTUM_CONFIRMED";

export function median(values) {
  if (!Array.isArray(values)) throw new TypeError("values must be an array");
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 === 0 ? (clean[middle - 1] + clean[middle]) / 2 : clean[middle];
}

export function scoreRelativeVelocity(ratio) {
  if (ratio === null || ratio === undefined) return null;
  if (!Number.isFinite(ratio)) throw new TypeError("ratio must be null or a finite number");
  if (ratio <= 0) return 0;
  return round(Math.max(0, Math.min(100, 50 + 25 * Math.log2(ratio))));
}

export function freshnessScore(publishedAt, now, maxAgeHours = 168) {
  const published = new Date(publishedAt).getTime();
  const current = new Date(now).getTime();
  if (Number.isNaN(published) || Number.isNaN(current)) {
    throw new TypeError("publishedAt and now must be valid timestamps");
  }
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    throw new TypeError("maxAgeHours must be positive");
  }
  const ageHours = Math.max(0, (current - published) / 3_600_000);
  return round(Math.max(0, 100 * (1 - ageHours / maxAgeHours)));
}

function toSnapshot(row) {
  return {
    sourceItemId: row.sourceIdentityId,
    capturedAt: row.capturedAt,
    metrics: {
      viewCount: row.viewCount,
      likeCount: null,
      commentCount: null,
      voteCount: null,
      starCount: null,
      forkCount: null,
      downloadCount: null,
    },
  };
}

function intervalHours(earlier, later) {
  const start = new Date(earlier).getTime();
  const end = new Date(later).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return (end - start) / 3_600_000;
}

function groupRows(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!row?.sourceIdentityId) throw new TypeError("each row needs sourceIdentityId");
    const bucket = grouped.get(row.sourceIdentityId) ?? [];
    bucket.push(row);
    grouped.set(row.sourceIdentityId, bucket);
  }
  for (const bucket of grouped.values()) {
    bucket.sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt));
  }
  return grouped;
}

function derivePair(earlier, later) {
  const hours = intervalHours(earlier.capturedAt, later.capturedAt);
  const velocity = deriveMetricVelocity(
    toSnapshot(earlier),
    toSnapshot(later),
    "viewCount",
  );
  return Object.freeze({
    sourceIdentityId: later.sourceIdentityId,
    channelId: later.channelId,
    endingAt: later.capturedAt,
    intervalHours: hours === null ? null : round(hours),
    observable: velocity.observable,
    perHour: velocity.observable ? velocity.perHour : null,
  });
}

function deriveBaselineIntervals(bucket, minSnapshotIntervalHours) {
  const intervals = [];
  for (let index = 1; index < bucket.length; index += 1) {
    const interval = derivePair(bucket[index - 1], bucket[index]);
    if (
      interval.observable &&
      interval.intervalHours !== null &&
      interval.intervalHours >= minSnapshotIntervalHours
    ) {
      intervals.push(interval);
    }
  }
  return intervals;
}

export function evaluateYouTubeMomentumGate({
  snapshotCount,
  snapshotIntervalHours,
  viewCountsObservable,
  channelId,
  baselineSampleCount,
  channelBaselineViewsPerHour,
  minSnapshotIntervalHours = 6,
  minBaselineSamples = 3,
} = {}) {
  const reasons = [];
  if (!Number.isInteger(snapshotCount) || snapshotCount < 2) {
    reasons.push("NEEDS_TWO_SNAPSHOTS");
  }
  if (
    !Number.isFinite(snapshotIntervalHours) ||
    snapshotIntervalHours < minSnapshotIntervalHours
  ) {
    reasons.push("SNAPSHOT_INTERVAL_TOO_SHORT");
  }
  if (viewCountsObservable !== true) reasons.push("VIEW_COUNT_NOT_OBSERVABLE");
  if (!channelId) reasons.push("CHANNEL_ID_NOT_OBSERVABLE");
  if (!Number.isInteger(baselineSampleCount) || baselineSampleCount < minBaselineSamples) {
    reasons.push("CHANNEL_BASELINE_INSUFFICIENT");
  }
  if (!(Number.isFinite(channelBaselineViewsPerHour) && channelBaselineViewsPerHour > 0)) {
    reasons.push("CHANNEL_BASELINE_NOT_POSITIVE");
  }
  return Object.freeze({
    promotionGate: reasons.length === 0 ? MOMENTUM_CONFIRMED : METRIC_REQUIRED,
    gateReasons: Object.freeze(reasons),
    snapshotCount,
    snapshotIntervalHours,
    baselineSampleCount,
    minSnapshotIntervalHours,
    minBaselineSamples,
  });
}

export function buildYouTubeDailyCandidates(
  rows,
  {
    now = new Date().toISOString(),
    minBaselineSamples = 3,
    minSnapshotIntervalHours = 6,
    maxAgeHours = 168,
  } = {},
) {
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
  if (!Number.isInteger(minBaselineSamples) || minBaselineSamples < 1) {
    throw new TypeError("minBaselineSamples must be a positive integer");
  }
  if (!Number.isFinite(minSnapshotIntervalHours) || minSnapshotIntervalHours <= 0) {
    throw new TypeError("minSnapshotIntervalHours must be positive");
  }

  const grouped = groupRows(rows);
  const baselineIntervalsByChannel = new Map();
  for (const bucket of grouped.values()) {
    for (const interval of deriveBaselineIntervals(bucket, minSnapshotIntervalHours)) {
      if (!interval.channelId) continue;
      const channelBucket = baselineIntervalsByChannel.get(interval.channelId) ?? [];
      channelBucket.push(interval);
      baselineIntervalsByChannel.set(interval.channelId, channelBucket);
    }
  }

  const candidates = [];
  for (const [sourceIdentityId, bucket] of grouped.entries()) {
    if (bucket.length < 2) continue;
    const latestRow = bucket.at(-1);
    const current = derivePair(bucket.at(-2), latestRow);
    const baselineValues = (baselineIntervalsByChannel.get(latestRow.channelId) ?? [])
      .filter(
        (interval) =>
          !(
            interval.sourceIdentityId === sourceIdentityId &&
            interval.endingAt === current.endingAt
          ),
      )
      .map((interval) => interval.perHour)
      .filter((value) => Number.isFinite(value) && value > 0);
    const baseline =
      baselineValues.length >= minBaselineSamples ? median(baselineValues) : null;
    const gate = evaluateYouTubeMomentumGate({
      snapshotCount: bucket.length,
      snapshotIntervalHours: current.intervalHours,
      viewCountsObservable: current.observable,
      channelId: latestRow.channelId,
      baselineSampleCount: baselineValues.length,
      channelBaselineViewsPerHour: baseline,
      minSnapshotIntervalHours,
      minBaselineSamples,
    });
    const confirmed = gate.promotionGate === MOMENTUM_CONFIRMED;
    const relativeRatio =
      confirmed && baseline > 0 ? current.perHour / baseline : null;
    const relativeVelocityScore = scoreRelativeVelocity(relativeRatio);
    const fresh = latestRow.publishedAt
      ? freshnessScore(latestRow.publishedAt, now, maxAgeHours)
      : null;
    const total = weightedScore([
      { key: "relativeVelocity", weight: 0.8, value: relativeVelocityScore },
      { key: "freshness", weight: 0.2, value: fresh },
    ]);
    const rankingScore = total.score === null ? null : round(total.score * total.coverage);

    candidates.push(
      Object.freeze({
        signalVersion: "youtube-momentum-v1",
        signalClass: confirmed ? "metric_momentum" : "metric_pending",
        promotionGate: gate.promotionGate,
        gateReasons: gate.gateReasons,
        sourceIdentityId,
        externalId: latestRow.externalId,
        title: latestRow.title,
        channelId: latestRow.channelId,
        publishedAt: latestRow.publishedAt,
        snapshotCount: bucket.length,
        snapshotIntervalHours: current.intervalHours,
        minSnapshotIntervalHours,
        currentViewsPerHour: current.perHour,
        baselineSampleCount: baselineValues.length,
        minBaselineSamples,
        channelBaselineViewsPerHour: baseline === null ? null : round(baseline),
        relativeRatio: relativeRatio === null ? null : round(relativeRatio),
        relativeVelocityScore,
        freshnessScore: fresh,
        score: total.score,
        rankingScore,
        coverage: total.coverage,
        missing: Object.freeze(total.missing),
        observedAt: latestRow.capturedAt,
      }),
    );
  }

  return Object.freeze(
    candidates.sort(
      (a, b) =>
        (a.promotionGate === MOMENTUM_CONFIRMED ? -1 : 0) -
          (b.promotionGate === MOMENTUM_CONFIRMED ? -1 : 0) ||
        (b.rankingScore ?? -1) - (a.rankingScore ?? -1) ||
        b.coverage - a.coverage ||
        (b.score ?? -1) - (a.score ?? -1) ||
        (b.currentViewsPerHour ?? -Infinity) -
          (a.currentViewsPerHour ?? -Infinity),
    ),
  );
}
