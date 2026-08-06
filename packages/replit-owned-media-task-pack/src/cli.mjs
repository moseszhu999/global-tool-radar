#!/usr/bin/env node
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {buildReplitOwnedMediaTaskPack, validateReplitOwnedMediaTaskPack} from './index.mjs';

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const paths = {
  productionCase: resolve(value('--production-case', 'apps/web/data/replit-design-production-case.json')),
  storyboardPackage: resolve(value('--storyboard', 'apps/web/data/replit-design-storyboard-package.json')),
  finalProps: resolve(value('--final-props', 'apps/remotion-video/props/final.json')),
  projectLedger: resolve(value('--project-ledger', 'apps/web/data/replit-design-video-project-ledger.json')),
  output: resolve(value('--output', 'artifacts/replit-owned-media-task-pack.json')),
};
const readJson = (path) => readFile(path, 'utf8').then(JSON.parse);
const [productionCase, storyboardPackage, finalProps, projectLedger] = await Promise.all([
  readJson(paths.productionCase),readJson(paths.storyboardPackage),readJson(paths.finalProps),readJson(paths.projectLedger),
]);
const pack = buildReplitOwnedMediaTaskPack({productionCase, storyboardPackage, finalProps, projectLedger});
validateReplitOwnedMediaTaskPack(pack);
await mkdir(dirname(paths.output), {recursive: true});
await writeFile(paths.output, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  taskPackId: pack.taskPackId,
  status: pack.status,
  fileCount: pack.files.length,
  finalRenderAllowed: pack.finalRenderAllowed,
  output: paths.output,
  taskPackDigest: pack.taskPackDigest,
}, null, 2));
