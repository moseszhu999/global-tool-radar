import assert from "node:assert/strict";
import test from "node:test";
import {
  buildYouTubeDailyCandidates,
  freshnessScore,
  median,
  scoreRelativeVelocity,
} from "../src/index.mjs";

test("median handles odd and even samples", () => {
  assert.equal(median([1, 9, 3]), 3);
  assert.equal(median([1, 3, 5, 7]), 4);
  assert.equal(median([]), null);
});

test("relative velocity score uses a bounded logarithmic scale", () => {
  assert.equal(scoreRelativeVelocity(1), 50);
  assert.equal(scoreRelativeVelocity(2), 75);
  assert.equal(scoreRelativeVelocity(4), 100);
  assert.equal(scoreRelativeVelocity(0), 0);
});

test("freshness decays to zero at the configured age", () => {
  assert.equal(
    freshnessScore("2026-08-02T00:00:00Z", "2026-08-03T00:00:00Z", 48),
    50,
  );
  assert.equal(
    freshnessScore("2026-08-01T00:00:00Z", "2026-08-03T00:00:00Z", 48),
    0,
  );
});

function row(sourceIdentityId, channelId, capturedAt, viewCount, overrides = {}) {
  return {
    sourceIdentityId,
    externalId: overrides.externalId ?? sourceIdentityId,
    title: overrides.title ?? sourceIdentityId,
    publishedAt: overrides.publishedAt ?? "2026-08-02T00:00:00Z",
    channelId,
    capturedAt,
    viewCount,
  };
}

test("candidate compares current velocity against channel history", () => {
  const rows = [
    row("old-1", "channel-1", "2026-08-01T00:00:00Z", 100),
    row("old-1", "channel-1", "2026-08-01T01:00:00Z", 110),
    row("old-2", "channel-1", "2026-08-01T00:00:00Z", 200),
    row("old-2", "channel-1", "2026-08-01T01:00:00Z", 210),
    row("old-3", "channel-1", "2026-08-01T00:00:00Z", 300),
    row("old-3", "channel-1", "2026-08-01T01:00:00Z", 310),
    row("new", "channel-1", "2026-08-03T00:00:00Z", 1000, {
      publishedAt: "2026-08-03T00:00:00Z",
    }),
    row("new", "channel-1", "2026-08-03T01:00:00Z", 1040, {
      publishedAt: "2026-08-03T00:00:00Z",
    }),
  ];
  const candidates = buildYouTubeDailyCandidates(rows, {
    now: "2026-08-03T01:00:00Z",
  });
  const current = candidates.find((candidate) => candidate.sourceIdentityId === "new");
  assert.equal(current.channelBaselineViewsPerHour, 10);
  assert.equal(current.relativeRatio, 4);
  assert.equal(current.relativeVelocityScore, 100);
  assert.equal(current.coverage, 1);
  assert.equal(current.rankingScore, current.score);
});

test("missing channel history remains missing instead of becoming zero", () => {
  const candidates = buildYouTubeDailyCandidates(
    [
      row("new", "channel-1", "2026-08-03T00:00:00Z", 100),
      row("new", "channel-1", "2026-08-03T01:00:00Z", 110),
    ],
    { now: "2026-08-03T01:00:00Z" },
  );
  assert.equal(candidates[0].channelBaselineViewsPerHour, null);
  assert.equal(candidates[0].relativeVelocityScore, null);
  assert.equal(candidates[0].coverage, 0.2);
  assert.ok(candidates[0].rankingScore < candidates[0].score);
  assert.deepEqual(candidates[0].missing, ["relativeVelocity"]);
});

test("declining public metrics are preserved and score at zero relative velocity", () => {
  const rows = [
    row("old-1", "channel-1", "2026-08-01T00:00:00Z", 100),
    row("old-1", "channel-1", "2026-08-01T01:00:00Z", 110),
    row("old-2", "channel-1", "2026-08-01T00:00:00Z", 200),
    row("old-2", "channel-1", "2026-08-01T01:00:00Z", 210),
    row("old-3", "channel-1", "2026-08-01T00:00:00Z", 300),
    row("old-3", "channel-1", "2026-08-01T01:00:00Z", 310),
    row("decline", "channel-1", "2026-08-03T00:00:00Z", 100),
    row("decline", "channel-1", "2026-08-03T01:00:00Z", 90),
  ];
  const candidates = buildYouTubeDailyCandidates(rows, {
    now: "2026-08-03T01:00:00Z",
  });
  const decline = candidates.find((candidate) => candidate.sourceIdentityId === "decline");
  assert.equal(decline.currentViewsPerHour, -10);
  assert.equal(decline.relativeVelocityScore, 0);
});
