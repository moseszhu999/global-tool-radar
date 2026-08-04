import test from "node:test";
import assert from "node:assert/strict";
import { buildPlatformReleasePackage, validatePlatformReleasePackage } from "../src/index.mjs";

const productionCase = {
  schemaVersion: "toolradar.video-production-case.v1",
  caseId: "video-case:test",
  gates: { publicationAllowed: false },
  policy: { formalPublicationPerformed: false },
  script: { platformCopy: {
    douyin: { title: "标题", description: "说明", tags: ["测试"] },
    bilibili: { title: "标题", description: "说明", tags: ["测试"] },
  }},
};
const renderPackage = { schemaVersion: "toolradar.render-preview-package.v1", sourceCaseId: productionCase.caseId, previewId: "preview:test" };
const renderReceipt = {
  schemaVersion: "toolradar.render-preview-receipt.v1", previewId: "preview:test", outputFile: "preview.mp4",
  sha256: "a".repeat(64), bytes: 2_000_000, actualDurationSeconds: 89, width: 1080, height: 1920,
  frameRate: 30, finalRender: false, publicationAllowed: false,
};
const qualityReport = {
  schemaVersion: "toolradar.video-quality-report.v1", releaseDecision: "BLOCKED",
  releaseBlockers: ["OWNED_SCREEN_RECORDINGS_REQUIRED"],
};

test("builds complete platform packages while blocking upload", () => {
  const value = buildPlatformReleasePackage({ productionCase, renderPackage, renderReceipt, qualityReport, generatedAt: "2026-08-04T12:00:00.000Z" });
  validatePlatformReleasePackage(value);
  assert.equal(value.state, "BLOCKED_BEFORE_UPLOAD");
  assert.equal(value.platforms.douyin.technicalPreflight, "PASS");
  assert.equal(value.platforms.bilibili.technicalPreflight, "PASS");
  assert.equal(value.gates.uploadAllowed, false);
  assert.equal(value.gates.publicationAllowed, false);
  assert.ok(value.releaseBlockers.includes("FINAL_RENDER_REQUIRED"));
  assert.ok(value.releaseBlockers.includes("OWNED_SCREEN_RECORDINGS_REQUIRED"));
});

test("rejects any package that enables publication", () => {
  const value = buildPlatformReleasePackage({ productionCase, renderPackage, renderReceipt, qualityReport, generatedAt: "2026-08-04T12:00:00.000Z" });
  value.gates.publicationAllowed = true;
  assert.throws(() => validatePlatformReleasePackage(value), /publication must remain disabled/);
});
