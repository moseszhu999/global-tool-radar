#!/usr/bin/env node
import {accessSync, constants} from 'node:fs';
import {spawnSync} from 'node:child_process';
import os from 'node:os';

const candidates = [];
if (process.env.BLENDER_BIN) candidates.push({source:'BLENDER_BIN', path:process.env.BLENDER_BIN});
if (process.platform === 'darwin') {
  candidates.push(
    {source:'mac_app', path:'/Applications/Blender.app/Contents/MacOS/Blender'},
    {source:'homebrew_arm64', path:'/opt/homebrew/bin/blender'},
    {source:'homebrew_intel', path:'/usr/local/bin/blender'},
  );
}
candidates.push({source:'PATH', path:'blender'});

const tried = [];
let selected = null;

for (const candidate of candidates) {
  let executable = false;
  if (candidate.path === 'blender') {
    const probe = spawnSync(candidate.path, ['--version'], {encoding:'utf8'});
    tried.push({source:candidate.source, path:candidate.path, status:probe.status, error:probe.error?.code ?? null});
    if (!probe.error && probe.status === 0) {
      selected = {...candidate, stdout:probe.stdout, stderr:probe.stderr};
      break;
    }
    continue;
  }
  try {
    accessSync(candidate.path, constants.X_OK);
    executable = true;
  } catch {}
  if (!executable) {
    tried.push({source:candidate.source, path:candidate.path, status:null, error:'NOT_EXECUTABLE_OR_MISSING'});
    continue;
  }
  const probe = spawnSync(candidate.path, ['--version'], {encoding:'utf8'});
  tried.push({source:candidate.source, path:candidate.path, status:probe.status, error:probe.error?.code ?? null});
  if (!probe.error && probe.status === 0) {
    selected = {...candidate, stdout:probe.stdout, stderr:probe.stderr};
    break;
  }
}

const firstLine = selected?.stdout?.split(/\r?\n/).find(Boolean) ?? null;
const receipt = {
  schemaVersion:'toolradar.blender.capability-probe.v1',
  probeMode:'READ_ONLY_VERSION_PROBE',
  hostname:os.hostname(),
  platform:process.platform,
  arch:process.arch,
  installed:Boolean(selected),
  executable:selected?.path ?? null,
  discoverySource:selected?.source ?? null,
  versionLine:firstLine,
  tried,
  filesModified:false,
  blendOpened:false,
  renderPerformed:false,
  externalStateModified:false,
};

process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
process.exitCode = selected ? 0 : 2;
