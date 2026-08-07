import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {computeMediaRenderInputManifestDigestV1, validateMediaRenderRequestV1} from '../src/index.mjs';

const fixture = JSON.parse(await readFile(new URL('../fixtures/request.example.json', import.meta.url), 'utf8'));

test('checked-in request fixture is self-consistent and digest-stable', () => {
  assert.equal(validateMediaRenderRequestV1(fixture), true);
  assert.equal(fixture.inputManifestDigest, computeMediaRenderInputManifestDigestV1(fixture));
});
