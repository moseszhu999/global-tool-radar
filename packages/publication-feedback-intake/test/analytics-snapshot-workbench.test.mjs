import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../../../apps/web/analytics-snapshot-workbench.html', import.meta.url), 'utf8');

test('analytics workbench is exact-media-bound and requires a real publication receipt', () => {
  assert.match(html, /13a72f8139040d15956c1cbc74d45f0193a7eb9269bbeec2e3a6292cddf87f1c/);
  assert.match(html, /toolradar\.publication-receipt\.v1/);
  assert.match(html, /toolradar\.platform-analytics-snapshot\.v1/);
  assert.match(html, /platformVideoId/);
  assert.match(html, /operatorConfirmed/);
  assert.match(html, /至少填写一个真实指标/);
});

test('analytics workbench remains local-only and never fabricates missing metrics', () => {
  assert.doesNotMatch(html, /fetch\s*\(/);
  assert.doesNotMatch(html, /XMLHttpRequest/);
  assert.doesNotMatch(html, /localStorage/);
  assert.doesNotMatch(html, /sessionStorage/);
  assert.match(html, /v===''\?null:Number\(v\)/);
  assert.match(html, /未知值保持为空/);
  assert.match(html, /不会把空值替换成零/);
});
