import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildPlatformReleasePackage, validatePlatformReleasePackage } from "../../../packages/platform-release-package/src/index.mjs";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const casePath = resolve(arg("--case", "apps/web/data/replit-design-production-case.json"));
const packagePath = resolve(arg("--render-package", "build/replit-design-render-preview-package.json"));
const receiptPath = resolve(arg("--render-receipt", "build/replit-design-render-receipt.json"));
const qualityPath = resolve(arg("--quality-report", "build/replit-design-video-quality-report.json"));
const outputPath = resolve(arg("--output", "build/replit-design-platform-release-package.json"));
const generatedAt = arg("--generated-at", new Date().toISOString());

const [productionCase, renderPackage, renderReceipt, qualityReport] = await Promise.all(
  [casePath, packagePath, receiptPath, qualityPath].map(async (path) => JSON.parse(await readFile(path, "utf8"))),
);
const releasePackage = buildPlatformReleasePackage({ productionCase, renderPackage, renderReceipt, qualityReport, generatedAt });
validatePlatformReleasePackage(releasePackage);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(releasePackage, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  outputPath,
  state: releasePackage.state,
  releaseBlockers: releasePackage.releaseBlockers,
  douyinPreflight: releasePackage.platforms.douyin.technicalPreflight,
  bilibiliPreflight: releasePackage.platforms.bilibili.technicalPreflight,
  uploadAllowed: releasePackage.gates.uploadAllowed,
  publicationAllowed: releasePackage.gates.publicationAllowed,
}, null, 2));
