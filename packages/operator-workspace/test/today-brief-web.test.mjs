import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const index = readFileSync(new URL("apps/web/index.html", root), "utf8");
const workspace = readFileSync(new URL("apps/web/workspace.html", root), "utf8");
const client = readFileSync(new URL("apps/web/today.mjs", root), "utf8");
const brief = JSON.parse(readFileSync(new URL("apps/web/data/today-brief.json", root), "utf8"));

test("default web entry explains the result before exposing the operator workspace", () => {
  assert.match(index, /今天海外 AI 工具/);
  assert.match(index, /先给结论，再给证据/);
  assert.match(index, /整条流程走到哪里/);
  assert.match(index, /href="\.\/workspace\.html"/);
  assert.match(workspace, /Radar inbox/);
  assert.match(workspace, /src="\.\/app\.mjs"/);
});

test("today brief binds the confirmed third capture", () => {
  assert.equal(brief.schemaVersion, "toolradar.today-brief.v1");
  assert.equal(brief.capture.channels, 11);
  assert.equal(brief.capture.videos, 165);
  assert.equal(brief.capture.measurementPoints, 495);
  assert.equal(brief.capture.videosWithConfirmedPositiveGrowth, 145);
  assert.equal(brief.capture.videosWithCompletedNoPositiveGrowth, 5);
  assert.equal(brief.capture.videosPendingChannelBaseline, 15);
  assert.equal(brief.capture.promotionGate, "MOMENTUM_CONFIRMED");
  assert.ok(brief.capture.intervalHours >= brief.capture.minimumConfirmationHours);
  assert.equal(brief.sourceEvidence.captureRunId, "30824192519");
  assert.match(brief.sourceEvidence.artifactZipSha256, /^[0-9a-f]{64}$/);
});

test("today page preserves claim boundaries and never turns missing values into zero", () => {
  assert.equal(brief.policy.missingNumericValueIsZero, false);
  assert.equal(brief.policy.momentumIsFinalDecision, false);
  assert.equal(brief.policy.automaticPublishingAllowed, false);
  assert.equal(brief.policy.sourceVideoDownloadAllowed, false);
  assert.equal(brief.signals.length, 5);
  assert.ok(brief.signals.every((signal) => signal.claimBoundary));
  assert.ok(brief.signals.every((signal) => ["research_now", "watch"].includes(signal.status)));
  assert.match(client, /MISSING_VALUE_POLICY_INVALID/);
  assert.match(client, /momentumIsFinalDecision/);
  assert.match(client, /页面不会把缺失数据显示成 0/);
});
