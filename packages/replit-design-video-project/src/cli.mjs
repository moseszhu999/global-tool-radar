#!/usr/bin/env node
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {buildReplitDesignVideoProjectLedger} from './index.mjs';

const args = process.argv.slice(2);
const value = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const productionCasePath = resolve(value('--production-case', 'apps/web/data/replit-design-production-case.json'));
const storyboardPath = resolve(value('--storyboard', 'apps/web/data/replit-design-storyboard-package.json'));
const outputPath = resolve(value('--output', 'apps/web/data/replit-design-video-project-ledger.json'));
const owner = value('--owner', 'moseszhu999');
const actor = value('--actor', 'toolradar-reconstruction-worker');

const [productionCase, storyboardPackage] = await Promise.all([
  readFile(productionCasePath, 'utf8').then(JSON.parse),
  readFile(storyboardPath, 'utf8').then(JSON.parse),
]);
const ledger = buildReplitDesignVideoProjectLedger({productionCase, storyboardPackage, owner, actor});
await mkdir(dirname(outputPath), {recursive: true});
await writeFile(outputPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({...ledger.summary, outputPath, sourceDigests: ledger.sourceDigests}));
