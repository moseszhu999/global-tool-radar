import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('requires all three canonical Replit shots', () => {
  for (const shotId of ['replit_prompt_to_build','replit_live_preview','replit_iteration_result']) {
    assert.match(html, new RegExp(shotId));
  }
});

test('hashes files locally with Web Crypto SHA-256', () => {
  assert.match(html, /crypto\.subtle\.digest\('SHA-256'/);
  assert.doesNotMatch(html, /fetch\(|XMLHttpRequest|WebSocket/);
});

test('cannot authorize publication', () => {
  assert.match(html, /publicationAllowed:false/);
  assert.match(html, /READY_FOR_FINAL_RENDER/);
});

test('requires explicit ownership and voice approval', () => {
  assert.match(html, /ownedBySubmitter/);
  assert.match(html, /voiceApproved/);
  assert.match(html, /voiceOwned/);
});
