import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../../../apps/web/replit-test.html', import.meta.url), 'utf8');
const jsonText = html.match(/<script id="card" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
assert.ok(jsonText, 'embedded test card data is required');
const card = JSON.parse(jsonText);

test('Replit Design card remains a human-login gated real test', () => {
  assert.equal(card.schemaVersion, 'toolradar.test-card.v1');
  assert.equal(card.status, 'READY_FOR_HUMAN_LOGIN');
  assert.equal(card.candidate.id, 'replit-design');
  assert.match(card.candidate.url, /^https:\/\/replit\.com\/\?stack=Design&prompt=[A-Za-z0-9+_-]+&referrer=global-tool-radar$/);
  assert.equal(card.evidence.platform, 'YouTube');
  assert.equal(card.evidence.intervalHours, 6.455);
  assert.match(card.evidence.boundary, /不证明某个国家火爆/);
  assert.equal(card.checks.length, 10);
});

test('test card forbids payments, credentials, databases and publishing', () => {
  assert.equal(card.safety.allowPayment, false);
  assert.equal(card.safety.allowConnectors, false);
  assert.equal(card.safety.allowSecrets, false);
  assert.equal(card.safety.allowDatabase, false);
  assert.equal(card.safety.allowPublishing, false);
  assert.equal(card.safety.allowSensitiveData, false);
  assert.equal(card.safety.credentialStorage, 'NEVER');
  assert.match(card.prompt, /不加支付/);
  assert.match(card.prompt, /不发布网站/);
});

test('page stores only local progress and exports a typed human receipt', () => {
  assert.match(html, /真实实测/);
  assert.match(html, /一键打开并带入提示词/);
  assert.match(html, /导出Receipt JSON/);
  assert.match(html, /toolradar\.test-receipt\.v1/);
  assert.match(html, /localStorage/);
  assert.doesNotMatch(html, /method:\s*['"]POST/);
});
