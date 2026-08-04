import test from "node:test";
import assert from "node:assert/strict";
import { buildFinalHumanReviewReceipt, validateFinalHumanReviewReceipt, REQUIRED_CHECKS } from "../src/index.mjs";

const baseReport = {
  schemaVersion: "toolradar.video-quality-report.v1",
  reportId: "preview:1:quality-report:v1",
  automatedGate: "PASS",
  releaseBlockers: [],
  metrics: { sha256: "a".repeat(64) },
};
const allPassed = Object.fromEntries(REQUIRED_CHECKS.map((id) => [id, true]));

test("approves release handoff only after all human checks and zero upstream blockers", () => {
  const receipt = buildFinalHumanReviewReceipt({ qualityReport: baseReport, reviewer: "Aaron", checks: allPassed, reviewedAt: "2026-08-05T03:00:00.000Z" });
  assert.equal(receipt.decision, "APPROVED_FOR_RELEASE_HANDOFF");
  assert.equal(receipt.releaseHandoffAllowed, true);
  assert.equal(receipt.publicationAllowed, false);
  assert.equal(validateFinalHumanReviewReceipt(receipt), true);
});

test("current preview remains blocked even if a reviewer checks every item", () => {
  const receipt = buildFinalHumanReviewReceipt({
    qualityReport: { ...baseReport, releaseBlockers: ["OWNED_SCREEN_RECORDINGS_REQUIRED", "FINAL_VOICE_APPROVAL_REQUIRED", "HUMAN_QUALITY_REVIEW_REQUIRED"] },
    reviewer: "Aaron",
    checks: allPassed,
  });
  assert.equal(receipt.decision, "BLOCKED");
  assert.equal(receipt.releaseHandoffAllowed, false);
  assert.deepEqual(receipt.upstreamBlockers, ["OWNED_SCREEN_RECORDINGS_REQUIRED", "FINAL_VOICE_APPROVAL_REQUIRED", "HUMAN_QUALITY_REVIEW_REQUIRED"]);
});

test("failed human check blocks release handoff and unknown checks do not count", () => {
  const receipt = buildFinalHumanReviewReceipt({ qualityReport: baseReport, reviewer: "Aaron", checks: { ...allPassed, subtitles_accurate: false, made_up_check: true } });
  assert.equal(receipt.releaseHandoffAllowed, false);
  assert.deepEqual(receipt.failedCheckIds, ["subtitles_accurate"]);
  assert.equal(receipt.checks.some((item) => item.id === "made_up_check"), false);
});

test("receipt never grants publication permission", () => {
  const receipt = buildFinalHumanReviewReceipt({ qualityReport: baseReport, reviewer: "Aaron", checks: allPassed });
  assert.throws(() => validateFinalHumanReviewReceipt({ ...receipt, publicationAllowed: true }), /cannot publish/);
});