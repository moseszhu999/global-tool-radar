import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildStoryboardManifest, validateStoryboardManifest } from "../../../packages/storyboard-manifest/src/index.mjs";
import { applyGoldDefaultsToStoryboardPackage, validateGoldTarget } from "../../../packages/video-gold-profile/src/index.mjs";

function parseArgs(argv) {
  const args = { input: null, output: null, generatedAt: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--input") args.input = argv[++index];
    else if (value === "--output") args.output = argv[++index];
    else if (value === "--generated-at") args.generatedAt = argv[++index];
    else throw new Error(`unknown argument: ${value}`);
  }
  if (!args.input) throw new Error("--input is required");
  return args;
}

const args = parseArgs(process.argv.slice(2));
const productionCase = JSON.parse(await readFile(resolve(args.input), "utf8"));
const value = applyGoldDefaultsToStoryboardPackage(buildStoryboardManifest(productionCase, {
  generatedAt: args.generatedAt ?? new Date().toISOString(),
}));
validateStoryboardManifest(value);
validateGoldTarget(value);
const output = `${JSON.stringify(value, null, 2)}\n`;
if (args.output) {
  const outputPath = resolve(args.output);
  await writeFile(outputPath, output, "utf8");
  console.log(JSON.stringify({
    packageId: value.packageId,
    status: value.status,
    qualityProfile: value.qualityProfile,
    goldBaselineTarget: value.gates.goldBaselineTarget,
    outputPath,
  }));
} else {
  process.stdout.write(output);
}
