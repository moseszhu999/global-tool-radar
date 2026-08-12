import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  applyPremiumTarget,
  buildPendingPremiumEvidence,
  validatePremiumTarget,
} from "../../../packages/video-premium-profile/src/index.mjs";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const inputPath = resolve(arg("--input", "build/replit-design-render-preview-package.json"));
const outputPath = resolve(arg("--output", "build/replit-design-premium-render-package.json"));
const evidencePath = resolve(arg("--premium-quality-template", "build/premium-quality-pending.json"));

const goldPackage = JSON.parse(await readFile(inputPath, "utf8"));
const premiumPackage = applyPremiumTarget(goldPackage);
validatePremiumTarget(premiumPackage);
const pendingEvidence = buildPendingPremiumEvidence(premiumPackage);

await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(evidencePath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(premiumPackage, null, 2)}\n`, "utf8");
await writeFile(evidencePath, `${JSON.stringify(pendingEvidence, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  inputPath,
  outputPath,
  evidencePath,
  inheritedQualityProfile: premiumPackage.inheritedQualityProfile,
  qualityProfile: premiumPackage.qualityProfile,
  qualityStage: premiumPackage.qualityStage,
  premiumBaselineTarget: premiumPackage.gates.premiumBaselineTarget,
  premiumBaselineRequired: premiumPackage.gates.premiumBaselineRequired,
  publicationAllowed: premiumPackage.gates.publicationAllowed,
}, null, 2));
