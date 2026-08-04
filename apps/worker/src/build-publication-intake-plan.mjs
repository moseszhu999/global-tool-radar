import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildPublicationIntakePlan } from "../../../packages/publication-feedback-intake/src/index.mjs";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const inputPath = resolve(arg("--input", "apps/web/data/replit-design-release-identity.json"));
const outputPath = resolve(arg("--output", "build/replit-design-publication-intake-plan.json"));
const generatedAt = arg("--generated-at", new Date().toISOString());

const releasePackage = JSON.parse(await readFile(inputPath, "utf8"));
const plan = buildPublicationIntakePlan({ releasePackage, generatedAt });
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  outputPath,
  intakePlanId: plan.intakePlanId,
  state: plan.state,
  mediaSha256: plan.mediaSha256,
  platformCount: Object.keys(plan.platforms).length,
  analyticsCollectionAllowed: plan.gates.analyticsCollectionAllowed,
  optimizationAllowed: plan.gates.optimizationAllowed,
}, null, 2));
