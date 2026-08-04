import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildVideoProductionCase, validateVideoProductionCase } from "../../../packages/video-production-case/src/index.mjs";

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
const inputPath = resolve(args.input);
const input = JSON.parse(await readFile(inputPath, "utf8"));
const productionCase = buildVideoProductionCase(input, {
  generatedAt: args.generatedAt ?? new Date().toISOString(),
});
validateVideoProductionCase(productionCase);
const output = `${JSON.stringify(productionCase, null, 2)}\n`;

if (args.output) {
  const outputPath = resolve(args.output);
  await writeFile(outputPath, output, "utf8");
  console.log(JSON.stringify({
    schemaVersion: productionCase.schemaVersion,
    caseId: productionCase.caseId,
    status: productionCase.status,
    outputPath,
  }));
} else {
  process.stdout.write(output);
}
