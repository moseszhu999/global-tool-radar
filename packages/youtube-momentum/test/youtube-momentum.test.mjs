import assert from "node:assert/strict";
import test from "node:test";
import {
  buildYouTubeDailyCandidates,
  evaluateYouTubeMomentumGate,
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

function confirmedRows() {
  return [
    row("old-1", "channel-1", "2026-08-01T00:00:00Z", 100),
    row("old-1", "channel-1", "2026-08-01T06:00:00Z", 160),
    row("old-2", "channel-1", "2026-08-01T00:00:00Z", 200),
    row("old-2", "channel-1", "2026-08-01T06:00:00Z", 260),
    row("old-3", "channel-1", "2026-08-01T00:00:00Z", 300),
    row("old-3", "channel-1", "2026-08-01T06:00:00Z", 360),
    row("new", "channel-1", "2026-08-03T00:00:00Z", 1000, {
      publishedAt: "2026-08-03T00:00:00Z",
    }),
    row("new", "channel-1", "2026-08-03T06:00:00Z", 1240, {
      publishedAt: "2026-08-03T00:00:00Z",
    }),
  ];
}

test("candidate is confirmed only with two spaced snapshots and channel history", () => {
  const candidates = buildYouTubeDailyCandidates(confirmedRows(), {
    now: "2026-08-03T06:00:00Z",
  });
  const current = candidates.find((candidate) => candidate.sourceIdentityId === "new");
  assert.equal(current.snapshotIntervalHours, 6);
  assert.equal(current.baselineSampleCount, 3);
  assert.equal(current.channelBaselineViewsPerHour, 10);
  assert.equal(current.currentViewsPerHour, 40);
  assert.equal(current.relativeRatio, 4);
  assert.equal(current.relativeVelocityScore, 100);
  assert.equal(current.promotionGate, "MOMENTUM_CONFIRMED");
  assert.deepEqual(current.gateReasons, []);
  assert.equal(current.coverage, 1);
});

test("snapshot intervals below six hours remain metric-pending", () => {
  const candidates = buildYouTubeDailyCandidates(
    [
      ...confirmedRows().filter((item) => item.sourceIdentityId !== "new"),
      row("new", "channel-1", "2026-08-03T00:00:00Z", 100),
      row("new", "channel-1", "2026-08-03T01:00:00Z", 200),
    ],
    { now: "2026-08-03T01:00:00Z" },
  );
  const current = candidates.find((candidate) => candidate.sourceIdentityId === "new");
  assert.equal(current.promotionGate, "METRIC_CONFIRMATION_REQUIRED");
  assert.ok(current.gateReasons.includes("SNAPSHOT_INTERVAL_TOO_SHORT"));
  assert.equal(current.relativeVelocityScore, null);
});

test("missing channel history remains missing instead of becoming zero", () => {
  const candidates = buildYouTubeDailyCandidates(
    [
      row("new", "channel-1", "2026-08-03T00:00:00Z", 100),
      row("new", "channel-1", "2026-08-03T06:00:00Z", 160),
    ],
    { now: "2026-08-03T06:00:00Z" },
  );
  assert.equal(candidates[0].channelBaselineViewsPerHour, null);
  assert.equal(candidates[0].relativeVelocityScore, null);
  assert.equal(candidates[0].promotionGate, "METRIC_CONFIRMATION_REQUIRED");
  assert.ok(candidates[0].gateReasons.includes("CHANNEL_BASELINE_INSUFFICIENT"));
  assert.equal(candidates[0].coverage, 0.2);
  assert.deepEqual(candidates[0].missing, ["relativeVelocity"]);
});

test("unobservable view counts cannot pass the gate", () => {
  const rows = confirmedRows();
  rows.at(-1).viewCount = null;
  const current = buildYouTubeDailyCandidates(rows, {
    now: "2026-08-03T06:00:00Z",
  }).find((candidate) => candidate.sourceIdentityId === "new");
  assert.equal(current.promotionGate, "METRIC_CONFIRMATION_REQUIRED");
  assert.ok(current.gateReasons.includes("VIEW_COUNT_NOT_OBSERVABLE"));
  assert.equal(current.currentViewsPerHour, null);
});

test("declining public metrics are preserved and confirmed at zero relative velocity", () => {
  const rows = [
    ...confirmedRows().filter((item) => item.sourceIdentityId !== "new"),
    row("decline", "channel-1", "2026-08-03T00:00:00Z", 100),
    row("decline", "channel-1", "2026-08-03T06:00:00Z", 40),
  ];
  const decline = buildYouTubeDailyCandidates(rows, {
    now: "2026-08-03T06:00:00Z",
  }).find((candidate) => candidate.sourceIdentityId === "decline");
  assert.equal(decline.currentViewsPerHour, -10);
  assert.equal(decline.relativeVelocityScore, 0);
  assert.equal(decline.promotionGate, "MOMENTUM_CONFIRMED");
});

test("gate reports every missing prerequisite deterministically", () => {
  const gate = evaluateYouTubeMomentumGate({
    snapshotCount: 1,
    snapshotIntervalHours: 1,
    viewCountsObservable: false,
    channelId: null,
    baselineSampleCount: 0,
    channelBaselineViewsPerHour: null,
  });
  assert.equal(gate.promotionGate, "METRIC_CONFIRMATION_REQUIRED");
  assert.deepEqual(gate.gateReasons, [
    "NEEDS_TWO_SNAPSHOTS",
    "SNAPSHOT_INTERVAL_TOO_SHORT",
    "VIEW_COUNT_NOT_OBSERVABLE",
    "CHANNEL_ID_NOT_OBSERVABLE",
    "CHANNEL_BASELINE_INSUFFICIENT",
    "CHANNEL_BASELINE_NOT_POSITIVE",
  ]);
});
