import test from "node:test";
import assert from "node:assert/strict";
import { buildVideoQualityReport, validateVideoQualityReport } from "../src/index.mjs";

const renderPackage = {
  schemaVersion: "toolradar.render-preview-package.v1",
  previewId: "preview:1",
  timelineDurationSeconds: 89,
  format: { width: 1080, height: 1920, frameRate: 30 },
  placeholderSlideIds: ["render:shot:03"],
  renderSlides: [{ placeholderRequired: true, previewLabel: "自有录屏待替换" }],
  subtitleCues: [{}],
  policy: { sourceVideoReuseAllowed: false },
  gates: { publicationAllowed: false, humanQualityReviewRequired: true },
  voiceover: { finalVoiceApprovalRequired: true },
};
const receipt = {
  schemaVersion: "toolradar.render-preview-receipt.v1",
  previewId: "preview:1",
  sha256: "a".repeat(64),
  bytes: 2161388,
  placeholderSlideIds: ["render:shot:03"],
  publicationAllowed: false,
};
const probe = {
  format: { duration: "89.046" },
  streams: [
    { codec_type: "video", codec_name: "h264", width: 1080, height: 1920, avg_frame_rate: "30/1" },
    { codec_type: "audio", codec_name: "aac" },
  ],
};

test("passes automated checks but blocks release on human-owned assets", () => {
  const report = buildVideoQualityReport({ renderPackage, renderReceipt: receipt, mediaProbe: probe, generatedAt: "2026-08-04T11:00:00.000Z" });
  assert.equal(report.automatedGate, "PASS");
  assert.equal(report.releaseDecision, "BLOCKED");
  assert.deepEqual(report.releaseBlockers, ["OWNED_SCREEN_RECORDINGS_REQUIRED", "FINAL_VOICE_APPROVAL_REQUIRED", "HUMAN_QUALITY_REVIEW_REQUIRED"]);
  assert.equal(report.publicationAllowed, false);
  assert.equal(validateVideoQualityReport(report), true);
});

test("fails automated gate when media dimensions are wrong", () => {
  const badProbe = structuredClone(probe);
  badProbe.streams[0].width = 720;
  const report = buildVideoQualityReport({ renderPackage, renderReceipt: receipt, mediaProbe: badProbe });
  assert.equal(report.automatedGate, "FAIL");
  assert.ok(report.failedCheckIds.includes("technical.resolution"));
  assert.ok(report.releaseBlockers.includes("AUTOMATED_QA_FAILED"));
});
