import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const workflowPath = resolve(here, '../../../.github/workflows/toolradar-shared-macrunner-v1.yml');
const workflow = await readFile(workflowPath, 'utf8');

test('shared MacRunner workflow is manual-only and owner-gated', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\npull_request:/);
  assert.match(workflow, /test "\$GITHUB_ACTOR" = "\$GITHUB_REPOSITORY_OWNER"/);
});

test('shared MacRunner workflow uses the proven common Mac labels', () => {
  for (const label of ['self-hosted', 'macOS', 'macmini', 'arm64']) {
    assert.match(workflow, new RegExp(`- ${label}`));
  }
});

test('shared MacRunner workflow locks exact same-repository heads and cleans persistent state', () => {
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /git branch -r --contains/);
  assert.match(workflow, /git reset --hard HEAD/);
  assert.match(workflow, /git clean -ffdx/);
});

test('local DeepSeek is optional and advisory-only', () => {
  assert.match(workflow, /run_deepseek:/);
  assert.match(workflow, /ollama run/);
  assert.match(workflow, /deepseek-advisory-receipt/);
  assert.doesNotMatch(workflow, /secrets\./);
});
