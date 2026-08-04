import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import { validateRenderPreviewPackage } from "../../../packages/render-preview/src/index.mjs";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    ...options,
  });
  if (result.status !== 0) {
    const detail = options.capture ? `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim() : "";
    throw new Error(`${command} failed${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout?.trim() ?? "";
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapChinese(value, width) {
  const lines = [];
  for (const paragraph of String(value).split("\n")) {
    let current = "";
    for (const char of paragraph) {
      current += char;
      if (current.length >= width) {
        lines.push(current);
        current = "";
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function tspans(lines, x, startY, lineHeight, className) {
  return lines.map((line, index) =>
    `<text x="${x}" y="${startY + index * lineHeight}" class="${className}">${escapeXml(line)}</text>`,
  ).join("\n");
}

function slideSvg(slide, totalSlides) {
  const titleLines = wrapChinese(slide.onScreenText, 15).slice(0, 5);
  const narrationLines = wrapChinese(slide.narrationText, 24).slice(0, 7);
  const warning = slide.placeholderRequired
    ? `<rect x="70" y="300" width="940" height="170" rx="28" fill="#4b1d1d" stroke="#ff8a80" stroke-width="4"/>
       <text x="540" y="365" text-anchor="middle" class="warning">自有录屏待替换</text>
       <text x="540" y="420" text-anchor="middle" class="warningSmall">本画面仅验证配音、字幕与剪辑流水线</text>`
    : `<rect x="70" y="300" width="940" height="120" rx="28" fill="#11352c" stroke="#48c78e" stroke-width="4"/>
       <text x="540" y="374" text-anchor="middle" class="ready">自有生成素材</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#07111f"/>
  <circle cx="900" cy="180" r="260" fill="#183b62" opacity="0.45"/>
  <circle cx="130" cy="1650" r="330" fill="#173c33" opacity="0.38"/>
  <style>
    text { font-family: 'Noto Sans CJK SC', sans-serif; fill: #f7fbff; }
    .brand { font-size: 42px; font-weight: 700; letter-spacing: 1px; }
    .meta { font-size: 30px; fill: #a9bdd2; }
    .title { font-size: 68px; font-weight: 700; }
    .warning { font-size: 54px; font-weight: 700; fill: #ffd5d1; }
    .warningSmall { font-size: 30px; fill: #ffd5d1; }
    .ready { font-size: 46px; font-weight: 700; fill: #a8f0cf; }
    .narration { font-size: 39px; fill: #eef6ff; }
    .footer { font-size: 27px; fill: #93aac0; }
  </style>
  <text x="70" y="105" class="brand">GLOBAL TOOL RADAR</text>
  <text x="70" y="160" class="meta">M9 · 9:16 自动合成预览</text>
  <text x="1010" y="105" text-anchor="end" class="meta">${slide.order}/${totalSlides}</text>
  ${warning}
  ${tspans(titleLines, 70, 620, 95, "title")}
  <rect x="55" y="1260" width="970" height="470" rx="34" fill="#0c1b2c" stroke="#355777" stroke-width="3"/>
  <text x="85" y="1325" class="meta">旁白字幕</text>
  ${tspans(narrationLines, 85, 1395, 58, "narration")}
  <text x="70" y="1840" class="footer">${escapeXml(slide.previewLabel)}</text>
  <text x="1010" y="1840" text-anchor="end" class="footer">${slide.startSecond}s–${slide.endSecond}s</text>
</svg>`;
}

function synthesizeVoice(text, outputPath) {
  for (const voice of ["cmn", "zh"]) {
    const result = spawnSync("espeak-ng", ["-v", voice, "-s", "185", "-p", "48", "-w", outputPath, text], {
      encoding: "utf8",
      stdio: "pipe",
    });
    if (result.status === 0) return voice;
  }
  throw new Error("espeak-ng could not synthesize a Mandarin preview voice");
}

const inputPath = resolve(arg("--input", "build/replit-design-render-preview-package.json"));
const outputPath = resolve(arg("--output", "build/replit-design-preview.mp4"));
const workDir = resolve(arg("--workdir", "build/render-preview-work"));
const receiptPath = resolve(arg("--receipt", "build/replit-design-render-receipt.json"));
const fontPath = arg("--font", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc");

const renderPackage = JSON.parse(await readFile(inputPath, "utf8"));
validateRenderPreviewPackage(renderPackage);
if (renderPackage.gates.previewRenderAllowed !== true) throw new Error("preview render is not allowed");
if (renderPackage.gates.publicationAllowed !== false) throw new Error("preview publication must remain disabled");
if (renderPackage.policy.sourceVideoReuseAllowed !== false) throw new Error("source video reuse must remain disabled");

for (const command of ["ffmpeg", "ffprobe", "espeak-ng", "rsvg-convert"]) {
  run(command, ["--version"], { capture: true });
}
await mkdir(workDir, { recursive: true });
await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(receiptPath), { recursive: true });

const segments = [];
let voiceUsed = null;
for (const [index, slide] of renderPackage.renderSlides.entries()) {
  const prefix = String(index + 1).padStart(2, "0");
  const svgPath = resolve(workDir, `${prefix}.svg`);
  const pngPath = resolve(workDir, `${prefix}.png`);
  const wavPath = resolve(workDir, `${prefix}.wav`);
  const segmentPath = resolve(workDir, `${prefix}.mp4`);

  await writeFile(svgPath, slideSvg(slide, renderPackage.renderSlides.length), "utf8");
  run("rsvg-convert", ["-w", "1080", "-h", "1920", "-o", pngPath, svgPath]);
  voiceUsed = synthesizeVoice(slide.narrationText, wavPath);
  const duration = String(slide.durationSeconds);
  run("ffmpeg", [
    "-y", "-loop", "1", "-i", pngPath, "-i", wavPath,
    "-filter_complex", `[1:a]apad=pad_dur=${duration},atrim=duration=${duration}[a]`,
    "-map", "0:v", "-map", "[a]", "-t", duration,
    "-r", String(renderPackage.format.frameRate),
    "-vf", `scale=${renderPackage.format.width}:${renderPackage.format.height},format=yuv420p`,
    "-c:v", renderPackage.format.videoCodec, "-preset", "veryfast", "-crf", "23",
    "-c:a", renderPackage.format.audioCodec, "-b:a", "128k",
    segmentPath,
  ]);
  segments.push(segmentPath);
}

const concatPath = resolve(workDir, "concat.txt");
await writeFile(concatPath, `${segments.map((segment) => `file '${segment.replaceAll("'", "'\\''")}'`).join("\n")}\n`, "utf8");
run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatPath, "-c", "copy", outputPath]);

const durationSeconds = Number(run("ffprobe", [
  "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", outputPath,
], { capture: true }));
const videoBytes = await readFile(outputPath);
const sha256 = createHash("sha256").update(videoBytes).digest("hex");
const receipt = {
  schemaVersion: "toolradar.render-preview-receipt.v1",
  previewId: renderPackage.previewId,
  outputFile: basename(outputPath),
  sha256,
  bytes: videoBytes.length,
  actualDurationSeconds: durationSeconds,
  targetDurationSeconds: renderPackage.timelineDurationSeconds,
  width: renderPackage.format.width,
  height: renderPackage.format.height,
  frameRate: renderPackage.format.frameRate,
  voiceEngine: renderPackage.voiceover.engine,
  voiceUsed,
  placeholderSlideIds: renderPackage.placeholderSlideIds,
  finalRender: false,
  publicationAllowed: false,
  humanQualityReviewRequired: true,
  fontPath,
};
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify(receipt, null, 2));
