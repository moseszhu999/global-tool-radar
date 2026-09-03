import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildRenderPreviewPackage,
  buildSrt,
  validateRenderPreviewPackage,
} from "../../../packages/render-preview/src/index.mjs";
import {
  applyGoldDefaultsToRenderPreviewPackage,
  buildPendingCreativeQualityEvidence,
  validateGoldTarget,
} from "../../../packages/video-gold-profile/src/index.mjs";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const inputPath = resolve(arg("--input", "apps/web/data/replit-design-storyboard-package.json"));
const outputPath = resolve(arg("--output", "build/replit-design-render-preview-package.json"));
const subtitlePath = resolve(arg("--subtitles", "build/replit-design-preview.srt"));
const creativeQualityTemplatePath = resolve(arg("--creative-quality-template", "build/gold-creative-quality-pending.json"));
const generatedAt = arg("--generated-at", new Date().toISOString());

const storyboardPackage = JSON.parse(await readFile(inputPath, "utf8"));
const renderPackage = applyGoldDefaultsToRenderPreviewPackage(buildRenderPreviewPackage(storyboardPackage, { generatedAt }));
validateRenderPreviewPackage(renderPackage);
validateGoldTarget(renderPackage);
const pendingCreativeQuality = buildPendingCreativeQualityEvidence(renderPackage);

await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(subtitlePath), { recursive: true });
await mkdir(dirname(creativeQualityTemplatePath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(renderPackage, null, 2)}\n`, "utf8");
await writeFile(subtitlePath, buildSrt(renderPackage), "utf8");
await writeFile(creativeQualityTemplatePath, `${JSON.stringify(pendingCreativeQuality, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  outputPath,
  subtitlePath,
  creativeQualityTemplatePath,
  qualityProfile: renderPackage.qualityProfile,
  qualityStage: renderPackage.qualityStage,
  goldBaselineTarget: renderPackage.gates.goldBaselineTarget,
  goldBaselineRequired: renderPackage.gates.goldBaselineRequired,
  slides: renderPackage.renderSlides.length,
  placeholders: renderPackage.placeholderSlideIds.length,
  durationSeconds: renderPackage.timelineDurationSeconds,
  publicationAllowed: renderPackage.gates.publicationAllowed,
}, null, 2));
