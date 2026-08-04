import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { buildVideoQualityReport, validateVideoQualityReport } from "../../../packages/video-quality-gate/src/index.mjs";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const packagePath = resolve(arg("--package", "build/replit-design-render-preview-package.json"));
const receiptPath = resolve(arg("--receipt", "build/replit-design-render-receipt.json"));
const videoPath = resolve(arg("--video", "build/replit-design-preview.mp4"));
const outputPath = resolve(arg("--output", "build/replit-design-video-quality-report.json"));
const generatedAt = arg("--generated-at", new Date().toISOString());

const probeResult = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", videoPath], { encoding: "utf8" });
if (probeResult.status !== 0) throw new Error(`ffprobe failed: ${probeResult.stderr}`);

const [renderPackage, renderReceipt] = await Promise.all([
  readFile(packagePath, "utf8").then(JSON.parse),
  readFile(receiptPath, "utf8").then(JSON.parse),
]);
const report = buildVideoQualityReport({ renderPackage, renderReceipt, mediaProbe: JSON.parse(probeResult.stdout), generatedAt });
validateVideoQualityReport(report);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, automatedGate: report.automatedGate, releaseDecision: report.releaseDecision, blockers: report.releaseBlockers }, null, 2));
if (report.automatedGate !== "PASS") process.exitCode = 1;
