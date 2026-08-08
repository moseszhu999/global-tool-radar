import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const load = async (name) => JSON.parse(await readFile(new URL(`../schema/${name}`, import.meta.url), 'utf8'));
const request = await load('media.render.v1.request.schema.json');
const result = await load('media.render.v1.result.schema.json');
const evidence = await load('media.render.v1.evidence.schema.json');

test('request/result/evidence schemas all pin media.render.v1 and reject undeclared fields', () => {
  assert.equal(request.properties.contractVersion.const, 'media.render.v1');
  assert.equal(result.properties.contractVersion.const, 'media.render.v1');
  assert.equal(evidence.properties.contractVersion.const, 'media.render.v1');
  assert.equal(request.additionalProperties, false);
  assert.equal(result.additionalProperties, false);
  assert.equal(evidence.additionalProperties, false);
});

test('schemas explicitly cover required request inputs and canonical lifecycle', () => {
  for (const key of ['purpose','shots','visualAssets','voice','captions','outputProfile','inputManifestDigest']) assert.ok(request.required.includes(key));
  assert.deepEqual(result.properties.status.enum, ['queued','running','succeeded','failed','cancelled']);
});

test('evidence schema explicitly requires ffprobe, SHA-256 input digest, and render log', () => {
  assert.equal(evidence.properties.mediaInspection.oneOf[1].properties.tool.const, 'ffprobe');
  assert.match(evidence.properties.inputManifestDigest.pattern, /64/);
  assert.ok(evidence.required.includes('renderLog'));
  assert.ok(evidence.required.includes('inputManifestDigest'));
});
