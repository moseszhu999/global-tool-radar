import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildRenderPreviewPackage,
  buildSrt,
  validateRenderPreviewPackage,
} from "../../../packages/render-preview/src/index.mjs";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const inputPath = resolve(arg("--input", "apps/web/data/replit-design-storyboard-package.json"));
const outputPath = resolve(arg("--output", "build/replit-design-render-preview-package.json"));
const subtitlePath = resolve(arg("--subtitles", "build/replit-design-preview.srt"));
const generatedAt = arg("--generated-at", new Date().toISOString());

const storyboardPackage = JSON.parse(await readFile(inputPath, "utf8"));
const renderPackage = buildRenderPreviewPackage(storyboardPackage, { generatedAt });
validateRenderPreviewPackage(renderPackage);

await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(subtitlePath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(renderPackage, null, 2)}\n`, "utf8");
await writeFile(subtitlePath, buildSrt(renderPackage), "utf8");

console.log(JSON.stringify({
  outputPath,
  subtitlePath,
  slides: renderPackage.renderSlides.length,
  placeholders: renderPackage.placeholderSlideIds.length,
  durationSeconds: renderPackage.timelineDurationSeconds,
  publicationAllowed: renderPackage.gates.publicationAllowed,
}, null, 2));
