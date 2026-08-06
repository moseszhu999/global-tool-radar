#!/usr/bin/env node
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {applyVideoProjectEvent, createVideoProject, summarizeVideoProject} from './index.mjs';

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const command = args[0];
const output = value('--output');
if (!['create', 'apply'].includes(command) || !output) {
  throw new Error('usage: cli.mjs create --input input.json --output project.json | apply --project project.json --event event.json --output project.json');
}

let project;
if (command === 'create') {
  const inputPath = value('--input');
  if (!inputPath) throw new Error('create requires --input');
  project = createVideoProject(JSON.parse(await readFile(resolve(inputPath), 'utf8')));
} else {
  const projectPath = value('--project');
  const eventPath = value('--event');
  if (!projectPath || !eventPath) throw new Error('apply requires --project and --event');
  const current = JSON.parse(await readFile(resolve(projectPath), 'utf8'));
  const event = JSON.parse(await readFile(resolve(eventPath), 'utf8'));
  project = applyVideoProjectEvent(current, event);
}

const outputPath = resolve(output);
await mkdir(dirname(outputPath), {recursive: true});
await writeFile(outputPath, `${JSON.stringify(project, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summarizeVideoProject(project)));
