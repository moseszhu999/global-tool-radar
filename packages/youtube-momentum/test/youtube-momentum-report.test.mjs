import assert from "node:assert/strict";
import test from "node:test";
import { buildAutomaticMomentumReport, renderAutomaticMomentumReportHtml } from "../../../apps/worker/src/build-youtube-momentum-report.mjs";

const channel = { channelId: "UC123", title: "Official AI Lab" };
function artifact(capturedAt, views, runId = "1") {
  return { artifactVersion: "youtube-public-capture-v1", capturedAt, captureRunId: runId, videoCount: Object.keys(views).length, succeededChannels: 1, videos: Object.entries(views).map(([id, viewCount]) => ({ channel, sourceItem: { externalId: id, sourceKey: `youtube_video:${id}`, sourceUrl: `https://youtube.test/watch?v=${id}`, title: `Video ${id}`, publishedAt: "2026-08-03T00:00:00Z" }, metricSnapshot: { capturedAt, metrics: { viewCount } } })) };
}

test("spaced captures confirm relative YouTube video growth", () => {
  const previousArtifact = artifact("2026-08-03T00:00:00Z", { a: 100, b: 100, c: 100, hot: 100 });
  const currentArtifact = artifact("2026-08-03T08:00:00Z", { a: 180, b: 260, c: 340, hot: 900 }, "2");
  const report = buildAutomaticMomentumReport({ previousArtifact, currentArtifact });
  assert.equal(report.intervalHours, 8);
  assert.equal(report.confirmedCount, 4);
  assert.equal(report.candidates[0].externalId, "hot");
  assert.equal(report.candidates[0].promotionGate, "MOMENTUM_CONFIRMED");
});

test("intervals below six hours remain pending", () => {
  const previousArtifact = artifact("2026-08-03T00:00:00Z", { a: 100, b: 100, c: 100, hot: 100 });
  const currentArtifact = artifact("2026-08-03T03:00:00Z", { a: 180, b: 260, c: 340, hot: 900 }, "2");
  const report = buildAutomaticMomentumReport({ previousArtifact, currentArtifact });
  assert.equal(report.confirmedCount, 0);
  assert.ok(report.candidates.every((item) => item.gateReasons.includes("SNAPSHOT_INTERVAL_TOO_SHORT")));
});

test("first cache run waits explicitly and HTML preserves claim boundaries", () => {
  const report = buildAutomaticMomentumReport({ currentArtifact: artifact("2026-08-03T08:00:00Z", { a: 180 }) });
  assert.equal(report.status, "WAITING_FOR_PREVIOUS_CAPTURE");
  const html = renderAutomaticMomentumReportHtml(report);
  assert.match(html, /发生平台/);
  assert.match(html, /YouTube/);
  assert.match(html, /不能确认增长/);
});

test("comparison HTML says country popularity is not proven", () => {
  const report = buildAutomaticMomentumReport({ previousArtifact: artifact("2026-08-03T00:00:00Z", { a: 100, b: 100, c: 100, hot: 100 }), currentArtifact: artifact("2026-08-03T08:00:00Z", { a: 180, b: 260, c: 340, hot: 900 }, "2") });
  const html = renderAutomaticMomentumReportHtml(report);
  assert.match(html, /不代表某个国家火爆/);
  assert.match(html, /打开原视频/);
});
