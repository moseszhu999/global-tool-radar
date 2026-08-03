import { deriveMetricVelocity } from "../../source-records/src/index.mjs";
import { weightedScore } from "../../scoring/src/index.mjs";

const round = (value) => Math.round(value * 100) / 100;

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

function deriveIntervals(bucket) {
  const intervals = [];
  for (let index = 1; index < bucket.length; index += 1) {
    const velocity = deriveMetricVelocity(
      toSnapshot(bucket[index - 1]),
      toSnapshot(bucket[index]),
      "viewCount",
    );
    if (velocity.observable) {
      intervals.push({
        sourceIdentityId: bucket[index].sourceIdentityId,
        channelId: bucket[index].channelId,
        endingAt: bucket[index].capturedAt,
        perHour: velocity.perHour,
      });
    }
  }
  return intervals;
}

export function buildYouTubeDailyCandidates(
  rows,
  { now = new Date().toISOString(), minBaselineSamples = 3, maxAgeHours = 168 } = {},
) {
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
  if (!Number.isInteger(minBaselineSamples) || minBaselineSamples < 1) {
    throw new TypeError("minBaselineSamples must be a positive integer");
  }

  const grouped = groupRows(rows);
  const intervalsBySource = new Map();
  const channelIntervals = new Map();

  for (const [sourceIdentityId, bucket] of grouped.entries()) {
    const intervals = deriveIntervals(bucket);
    intervalsBySource.set(sourceIdentityId, intervals);
    for (const interval of intervals) {
      if (!interval.channelId) continue;
      const channelBucket = channelIntervals.get(interval.channelId) ?? [];
      channelBucket.push(interval);
      channelIntervals.set(interval.channelId, channelBucket);
    }
  }

  const candidates = [];
  for (const [sourceIdentityId, bucket] of grouped.entries()) {
    if (bucket.length < 2) continue;
    const latestRow = bucket.at(-1);
    const intervals = intervalsBySource.get(sourceIdentityId) ?? [];
    const current = intervals.at(-1);
    if (!current) continue;

    const baselineValues = (channelIntervals.get(latestRow.channelId) ?? [])
      .filter(
        (interval) =>
          !(
            interval.sourceIdentityId === sourceIdentityId &&
            interval.endingAt === current.endingAt
          ),
      )
      .map((interval) => interval.perHour)
      .filter((value) => value > 0);
    const baseline = baselineValues.length >= minBaselineSamples ? median(baselineValues) : null;
    const relativeRatio = baseline && baseline > 0 ? current.perHour / baseline : null;
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
        sourceIdentityId,
        externalId: latestRow.externalId,
        title: latestRow.title,
        channelId: latestRow.channelId,
        publishedAt: latestRow.publishedAt,
        currentViewsPerHour: current.perHour,
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
        (b.rankingScore ?? -1) - (a.rankingScore ?? -1) ||
        b.coverage - a.coverage ||
        (b.score ?? -1) - (a.score ?? -1) ||
        b.currentViewsPerHour - a.currentViewsPerHour,
    ),
  );
}
