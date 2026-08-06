import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {buildReplitDesignVideoProjectLedger} from '../../../packages/replit-design-video-project/src/index.mjs';

const productionCasePath = resolve('apps/web/data/replit-design-production-case.json');
const storyboardPath = resolve('apps/web/data/replit-design-storyboard-package.json');
const outputPath = resolve(process.env.TOOLRADAR_VIDEO_PROJECT_OUTPUT || 'apps/web/data/replit-design-video-project-ledger.json');

const [productionCase, storyboardPackage] = await Promise.all([
  readFile(productionCasePath, 'utf8').then(JSON.parse),
  readFile(storyboardPath, 'utf8').then(JSON.parse),
]);
const ledger = buildReplitDesignVideoProjectLedger({productionCase, storyboardPackage});
await mkdir(dirname(outputPath), {recursive: true});
await writeFile(outputPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({...ledger.summary, outputPath, sourceDigests: ledger.sourceDigests}, null, 2));
