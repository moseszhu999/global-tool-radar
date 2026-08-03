import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const receipt = JSON.parse(
  readFileSync(
    new URL(
      "../../../evidence/receipts/2026-08-03-youtube-public-capture-run-30796846375-v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("production capture receipt binds the GitHub run, commit and artifact digests", () => {
  assert.equal(
    receipt.receiptVersion,
    "toolradar-youtube-public-capture-receipt-v1",
  );
  assert.equal(receipt.status, "VERIFIED");
  assert.equal(receipt.sourceArtifact.artifactVersion, "youtube-public-capture-v1");
  assert.equal(receipt.sourceArtifact.runId, "30796846375");
  assert.equal(receipt.sourceArtifact.artifactId, "8849196993");
  assert.equal(
    receipt.sourceArtifact.sourceCommitSha,
    "b650b3b21876612b2e24c65eb825c3bd360a254e",
  );
  assert.match(receipt.sourceArtifact.zipSha256, /^[0-9a-f]{64}$/);
  assert.match(receipt.sourceArtifact.jsonSha256, /^[0-9a-f]{64}$/);
  assert.equal(receipt.sourceArtifact.requestedChannels, 11);
  assert.equal(receipt.sourceArtifact.succeededChannels, 11);
  assert.equal(receipt.sourceArtifact.failedChannels, 0);
  assert.equal(receipt.sourceArtifact.videoCount, 165);
  assert.equal(receipt.sourceArtifact.metricSnapshotCount, 165);
});

test("production capture imports metric snapshots atomically and replays idempotently", () => {
  assert.deepEqual(receipt.importReceipt, {
    mode: "metric_snapshot_for_existing_source_revision",
    requested: 165,
    matchedExistingSources: 165,
    processed: 165,
    revisionsInserted: 0,
    snapshotsInserted: 165,
    atomic: true,
  });
  assert.deepEqual(receipt.exactReplay, {
    processed: 165,
    revisionsInserted: 0,
    snapshotsInserted: 0,
  });
  assert.equal(receipt.databaseVerification.sourceIdentities, 165);
  assert.equal(receipt.databaseVerification.sourceRevisions, 165);
  assert.equal(receipt.databaseVerification.metricSnapshots, 330);
  assert.equal(receipt.databaseVerification.activeChannels, 11);
  assert.equal(receipt.databaseVerification.videosWithMeasuredIntervals, 165);
});

test("short production intervals remain blocked from momentum confirmation", () => {
  assert.equal(receipt.databaseVerification.positiveIntervals, 140);
  assert.equal(receipt.databaseVerification.zeroIntervals, 25);
  assert.equal(receipt.databaseVerification.negativeIntervals, 0);
  assert.equal(receipt.databaseVerification.channelsWithIntervals, 11);
  assert.equal(receipt.databaseVerification.minimumIntervalsPerChannel, 15);
  assert.equal(receipt.databaseVerification.maximumIntervalsPerChannel, 15);
  assert.equal(receipt.promotionBoundary.currentGate, "METRIC_CONFIRMATION_REQUIRED");
  assert.equal(receipt.promotionBoundary.momentumConfirmedCount, 0);
  assert.equal(receipt.promotionBoundary.minimumRequiredIntervalHours, 6);
  assert.ok(
    receipt.promotionBoundary.observedIntervalHours <
      receipt.promotionBoundary.minimumRequiredIntervalHours,
  );
  assert.equal(
    receipt.promotionBoundary.blockingReason,
    "SNAPSHOT_INTERVAL_TOO_SHORT",
  );
});
