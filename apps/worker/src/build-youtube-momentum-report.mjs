import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { buildYouTubeDailyCandidates } from "../../../packages/youtube-momentum/src/index.mjs";

const VERSION = "youtube-public-capture-v1";
const round = (value) => value == null ? null : Math.round(value * 100) / 100;
const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const num = (value) => Number.isFinite(value) ? new Intl.NumberFormat("zh-CN").format(Math.round(value)) : "未知";

function assertArtifact(artifact, label) {
  if (!artifact || artifact.artifactVersion !== VERSION || !Array.isArray(artifact.videos)) {
    throw new Error(`${label} artifact is not a ${VERSION} artifact`);
  }
  if (Number.isNaN(new Date(artifact.capturedAt).getTime())) {
    throw new Error(`${label} artifact capturedAt is invalid`);
  }
}

function rows(artifact) {
  return artifact.videos.filter((video) => video?.sourceItem?.sourceKey && video?.metricSnapshot).map((video) => ({
    sourceIdentityId: video.sourceItem.sourceKey,
    externalId: video.sourceItem.externalId,
    title: video.sourceItem.title,
    channelId: video.channel?.channelId ?? null,
    channelTitle: video.channel?.title ?? null,
    sourceUrl: video.sourceItem.sourceUrl,
    publishedAt: video.sourceItem.publishedAt,
    capturedAt: video.metricSnapshot.capturedAt,
    viewCount: video.metricSnapshot.metrics?.viewCount ?? null,
  }));
}

export function buildAutomaticMomentumReport({ previousArtifact = null, currentArtifact }) {
  assertArtifact(currentArtifact, "current");
  if (!previousArtifact) {
    return Object.freeze({
      reportVersion: "youtube-automatic-momentum-report-v1",
      status: "WAITING_FOR_PREVIOUS_CAPTURE",
      generatedAt: currentArtifact.capturedAt,
      platform: "YouTube",
      intervalHours: null,
      comparedVideoCount: 0,
      confirmedCount: 0,
      pendingCount: currentArtifact.videoCount ?? currentArtifact.videos.length,
      candidates: Object.freeze([]),
      claimBoundary: "当前只有一轮缓存数据，不能确认增长，也不能推断国家或产品采用情况。",
    });
  }
  assertArtifact(previousArtifact, "previous");
  const previousAt = new Date(previousArtifact.capturedAt).getTime();
  const currentAt = new Date(currentArtifact.capturedAt).getTime();
  if (currentAt <= previousAt) throw new Error("current artifact must be newer than previous artifact");
  const metadata = new Map(rows(currentArtifact).map((row) => [row.sourceIdentityId, row]));
  const candidates = buildYouTubeDailyCandidates([...rows(previousArtifact), ...rows(currentArtifact)], {
    now: currentArtifact.capturedAt,
    minSnapshotIntervalHours: 6,
    minBaselineSamples: 3,
  }).map((candidate) => {
    const meta = metadata.get(candidate.sourceIdentityId) ?? {};
    return Object.freeze({
      ...candidate,
      channelTitle: meta.channelTitle ?? null,
      sourceUrl: meta.sourceUrl ?? null,
      currentViewsPerHour: round(candidate.currentViewsPerHour),
      channelBaselineViewsPerHour: round(candidate.channelBaselineViewsPerHour),
      relativeRatio: round(candidate.relativeRatio),
    });
  });
  const confirmedCount = candidates.filter((item) => item.promotionGate === "MOMENTUM_CONFIRMED").length;
  return Object.freeze({
    reportVersion: "youtube-automatic-momentum-report-v1",
    status: "COMPARISON_COMPLETE",
    generatedAt: currentArtifact.capturedAt,
    platform: "YouTube",
    previousCaptureRunId: previousArtifact.captureRunId,
    currentCaptureRunId: currentArtifact.captureRunId,
    intervalHours: round((currentAt - previousAt) / 3_600_000),
    comparedVideoCount: candidates.length,
    confirmedCount,
    pendingCount: candidates.length - confirmedCount,
    candidates: Object.freeze(candidates),
    claimBoundary: "确认的是YouTube官方频道视频在该时间段内的相对增长，不代表某个国家火爆，也不等于产品真实采用。",
  });
}

export function renderAutomaticMomentumReportHtml(report) {
  if (report?.reportVersion !== "youtube-automatic-momentum-report-v1") throw new TypeError("invalid report");
  const cards = report.candidates.length ? report.candidates.slice(0, 20).map((item) => {
    const confirmed = item.promotionGate === "MOMENTUM_CONFIRMED";
    const reasons = item.gateReasons.length ? item.gateReasons.join("、") : "已满足6小时间隔、播放量可观测和频道基线要求";
    return `<article class="card ${confirmed ? "ok" : "wait"}"><header><div><h3>${esc(item.title || item.externalId)}</h3><p>${esc(item.channelTitle || "频道未知")} · YouTube官方频道视频</p></div><b>${confirmed ? "YouTube增长已确认" : "证据仍不足"}</b></header><div class="metrics"><div><small>最近区间</small><strong>${num(item.snapshotIntervalHours)}小时</strong></div><div><small>本视频每小时增长</small><strong>${num(item.currentViewsPerHour)}</strong></div><div><small>同频道基线</small><strong>${num(item.channelBaselineViewsPerHour)}</strong></div><div><small>相对基线</small><strong>${item.relativeRatio == null ? "未知" : `${item.relativeRatio}倍`}</strong></div></div><p>判断依据：${esc(reasons)}</p>${item.sourceUrl ? `<a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">打开原视频</a>` : ""}</article>`;
  }).join("\n") : '<div class="empty">还没有足够的两轮数据，下一轮采集后会自动生成比较结果。</div>';
  const waiting = report.status === "WAITING_FOR_PREVIOUS_CAPTURE";
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Global Tool Radar · YouTube趋势确认</title><style>:root{--bg:#08111f;--panel:#101b2d;--line:#293b55;--text:#f6f8fc;--muted:#9fb0c8;--green:#45d49d;--yellow:#f1c65f}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.wrap{max-width:1120px;margin:auto;padding:38px 20px 70px}.hero,.card,.boundary,.empty{background:var(--panel);border:1px solid var(--line);border-radius:20px}.hero{padding:30px}.eyebrow{color:var(--green);font-size:12px;font-weight:800;letter-spacing:.12em}.hero h1{font-size:clamp(32px,5vw,54px);line-height:1.12;margin:7px 0 12px}.lead,.card p{color:var(--muted)}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px}.stats div,.metrics div{padding:14px;border-radius:12px;background:#0b1728;border:1px solid var(--line)}small,strong{display:block}.stats strong{font-size:25px}.boundary{margin-top:18px;padding:18px;border-left:4px solid var(--yellow)}section{margin-top:34px}.cards{display:grid;gap:13px}.card{padding:20px}.card.ok{border-left:4px solid var(--green)}.card.wait{border-left:4px solid var(--yellow)}.card header{display:flex;justify-content:space-between;gap:16px}.card h3{margin:0}.card header b{white-space:nowrap}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:14px 0}.card a{color:#dce8ff}.empty{padding:26px;color:var(--muted)}@media(max-width:760px){.stats,.metrics{grid-template-columns:repeat(2,1fr)}.card header{display:block}}</style></head><body><main class="wrap"><section class="hero"><div class="eyebrow">GLOBAL TOOL RADAR · 自动趋势报告</div><h1>${waiting ? "正在建立对比基线" : "第三层：YouTube增长确认结果"}</h1><p class="lead">${waiting ? "目前只有一轮缓存数据，暂时不能确认增长。" : `本轮比较${num(report.comparedVideoCount)}条同一视频，其中${num(report.confirmedCount)}条满足增长确认门。`}</p><div class="stats"><div><small>发生平台</small><strong>YouTube</strong></div><div><small>两轮间隔</small><strong>${report.intervalHours == null ? "等待下一轮" : `${report.intervalHours}小时`}</strong></div><div><small>确认增长</small><strong>${num(report.confirmedCount)}</strong></div><div><small>仍待确认</small><strong>${num(report.pendingCount)}</strong></div></div></section><div class="boundary"><strong>这份报告能说明什么：</strong>${esc(report.claimBoundary)}</div><section><h2>逐条结果</h2><div class="cards">${cards}</div></section></main></body></html>`;
}

async function readJson(path, optional = false) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (error) { if (optional && error?.code === "ENOENT") return null; throw error; }
}

async function main() {
  const currentPath = process.env.TOOLRADAR_CURRENT_ARTIFACT_PATH ?? "out/youtube-public-capture.json";
  const previousPath = process.env.TOOLRADAR_PREVIOUS_ARTIFACT_PATH ?? "out/history/latest.json";
  const jsonPath = process.env.TOOLRADAR_MOMENTUM_REPORT_JSON ?? "out/youtube-momentum-report.json";
  const htmlPath = process.env.TOOLRADAR_MOMENTUM_REPORT_HTML ?? "out/youtube-momentum-report.html";
  const report = buildAutomaticMomentumReport({ previousArtifact: await readJson(previousPath, true), currentArtifact: await readJson(currentPath) });
  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(htmlPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(htmlPath, renderAutomaticMomentumReportHtml(report), "utf8");
  console.log(JSON.stringify({ status: report.status, confirmedCount: report.confirmedCount, pendingCount: report.pendingCount, jsonPath, htmlPath }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
