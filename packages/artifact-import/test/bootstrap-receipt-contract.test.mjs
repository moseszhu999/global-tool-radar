import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const receipt = JSON.parse(
  readFileSync(
    new URL(
      "../../../evidence/receipts/2026-08-03-youtube-rss-bootstrap-v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("bootstrap receipt binds one complete artifact to the verified Neon counts", () => {
  assert.equal(receipt.receiptVersion, "toolradar-youtube-rss-bootstrap-v1");
  assert.equal(receipt.status, "VERIFIED");
  assert.match(receipt.sourceArtifact.jsonSha256, /^[0-9a-f]{64}$/);
  assert.equal(receipt.sourceArtifact.requestedChannels, 11);
  assert.equal(receipt.sourceArtifact.succeededChannels, 11);
  assert.equal(receipt.sourceArtifact.failedChannels, 0);
  assert.equal(receipt.sourceArtifact.videoCount, 165);
  assert.equal(receipt.sourceArtifact.metricSnapshotCount, 165);
  assert.equal(receipt.databaseVerification.sourceIdentities, 165);
  assert.equal(receipt.databaseVerification.sourceRevisions, 165);
  assert.equal(receipt.databaseVerification.metricSnapshots, 165);
  assert.equal(receipt.databaseVerification.activeChannels, 11);
  assert.equal(receipt.databaseVerification.channelsWithBootstrapEvidence, 11);
  assert.equal(receipt.databaseVerification.revisionsPerChannel, 15);
  assert.equal(receipt.databaseVerification.distinctBootstrapArtifactDigests, 1);
});

test("bootstrap batches tie out and cannot satisfy the production momentum gate", () => {
  const totals = receipt.batchReceipts.reduce(
    (sum, batch) => ({
      processed: sum.processed + batch.processed,
      revisionsInserted: sum.revisionsInserted + batch.revisionsInserted,
      snapshotsInserted: sum.snapshotsInserted + batch.snapshotsInserted,
    }),
    { processed: 0, revisionsInserted: 0, snapshotsInserted: 0 },
  );
  assert.deepEqual(totals, {
    processed: 150,
    revisionsInserted: 150,
    snapshotsInserted: 150,
  });
  assert.equal(receipt.databaseVerification.bootstrapRevisions, 150);
  assert.equal(receipt.promotionBoundary.countsAsProductionSnapshot, false);
  assert.equal(receipt.promotionBoundary.canConfirmMomentumAlone, false);
  assert.match(receipt.promotionBoundary.requiredNextEvidence, /commit-bound/i);
  assert.match(receipt.promotionBoundary.requiredNextEvidence, /six hours/i);
});
