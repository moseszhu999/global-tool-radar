import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  importYouTubePublicArtifact,
  sha256Hex,
} from "../../../packages/artifact-import/src/index.mjs";
import { createNeonQuery } from "../../../packages/persistence/neon-http/src/client.mjs";
import { createNeonArtifactImportRepository } from "../../../packages/persistence/neon-http/src/artifact-import.mjs";
import { verifyNeonRuntime } from "../../../packages/runtime-identity/src/index.mjs";
import { readNeonRuntimeEnv } from "./runtime-env.mjs";

const artifactPath =
  process.env.TOOLRADAR_ARTIFACT_PATH ?? "out/youtube-public-capture.json";
const receiptPath =
  process.env.TOOLRADAR_IMPORT_RECEIPT ??
  "out/youtube-public-import-receipt.json";
const expectedArtifactSha256 = process.env.TOOLRADAR_ARTIFACT_SHA256;
const expectedSourceCommitSha = process.env.TOOLRADAR_ARTIFACT_COMMIT_SHA;
const batchSize = Number(process.env.TOOLRADAR_IMPORT_BATCH_SIZE ?? 25);

if (!expectedArtifactSha256) {
  throw new Error("TOOLRADAR_ARTIFACT_SHA256 is required");
}
if (!expectedSourceCommitSha) {
  throw new Error("TOOLRADAR_ARTIFACT_COMMIT_SHA is required");
}

const bytes = await readFile(artifactPath);
const artifactSha256 = sha256Hex(bytes);
let artifact;
try {
  artifact = JSON.parse(bytes.toString("utf8"));
} catch {
  throw new Error("YouTube public capture artifact is not valid JSON");
}

const runtimeEnv = readNeonRuntimeEnv();
const query = createNeonQuery(runtimeEnv.databaseUrl);
await verifyNeonRuntime({ ...runtimeEnv, query });
const repository = createNeonArtifactImportRepository({ query });
const receipt = await importYouTubePublicArtifact({
  artifact,
  artifactSha256,
  expectedArtifactSha256,
  expectedSourceCommitSha,
  repository,
  batchSize,
});

await mkdir(dirname(receiptPath), { recursive: true });
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ receiptPath, ...receipt }, null, 2));
