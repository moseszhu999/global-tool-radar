import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {buildReplitOwnedMediaTaskPack, validateReplitOwnedMediaTaskPack} from '../../../packages/replit-owned-media-task-pack/src/index.mjs';

const readJson = (path) => readFile(resolve(path), 'utf8').then(JSON.parse);
const [productionCase, storyboardPackage, finalProps, projectLedger] = await Promise.all([
  readJson('apps/web/data/replit-design-production-case.json'),
  readJson('apps/web/data/replit-design-storyboard-package.json'),
  readJson('apps/remotion-video/props/final.json'),
  readJson('apps/web/data/replit-design-video-project-ledger.json'),
]);
const pack = buildReplitOwnedMediaTaskPack({productionCase, storyboardPackage, finalProps, projectLedger});
validateReplitOwnedMediaTaskPack(pack);
const output = resolve(process.env.TOOLRADAR_OWNED_MEDIA_TASK_PACK_OUTPUT || 'artifacts/replit-owned-media-task-pack.json');
await mkdir(dirname(output), {recursive: true});
await writeFile(output, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({taskPackId: pack.taskPackId, status: pack.status, output, taskPackDigest: pack.taskPackDigest}, null, 2));
