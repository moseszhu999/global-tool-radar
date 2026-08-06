import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';

const exec = promisify(execFile);
const cli = resolve('src/cli.mjs');

test('CLI creates and advances a project using JSON files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'toolradar-video-project-'));
  const input = join(dir, 'input.json');
  const project = join(dir, 'project.json');
  const event = join(dir, 'event.json');
  const selected = join(dir, 'selected.json');
  await writeFile(input, JSON.stringify({
    projectId: 'project:one',
    owner: 'operator',
    createdAt: '2026-08-06T12:00:00Z',
    sourceSignal: {id: 'signal:one', title: 'One tool', platform: 'youtube'},
  }));
  await exec(process.execPath, [cli, 'create', '--input', input, '--output', project], {cwd: resolve('.')});
  await writeFile(event, JSON.stringify({
    eventId: 'select-1', type: 'SELECT_CANDIDATE', actor: 'operator',
    occurredAt: '2026-08-06T12:01:00Z', reason: 'Strong fit',
  }));
  await exec(process.execPath, [cli, 'apply', '--project', project, '--event', event, '--output', selected], {cwd: resolve('.')});
  const value = JSON.parse(await readFile(selected, 'utf8'));
  assert.equal(value.stage, 'SELECTED');
  assert.equal(value.events.length, 1);
});
