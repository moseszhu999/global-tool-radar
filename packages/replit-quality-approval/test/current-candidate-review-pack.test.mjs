import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {prepareQualityReviewPackFromProject} from '../src/index.mjs';

const ledgerUrl = new URL('../../../docs/video/evidence/m10-explainer-v2-render-completed-import-ledger.json', import.meta.url);
const reviewPackUrl = new URL('../../../docs/video/evidence/m10-explainer-v2-quality-review-pack.json', import.meta.url);

const readJson = async (url) => JSON.parse(await readFile(url, 'utf8'));

test('committed current-candidate M10 review pack is exactly derived from the canonical render-completed ledger', async () => {
  const [project, committedPack] = await Promise.all([
    readJson(ledgerUrl),
    readJson(reviewPackUrl),
  ]);

  const generatedPack = prepareQualityReviewPackFromProject({
    project,
    createdAt: committedPack.createdAt,
    reviewerInstructionsVersion: committedPack.reviewerInstructionsVersion,
  });

  assert.deepEqual(generatedPack, committedPack);
  assert.equal(generatedPack.digest, '5e444ceb20cab43669045eefd384bc9f31b793bc769fffe84c176597c1d40641');
  assert.equal(generatedPack.finalVideo.sha256, '1de5e8a6e25b8e25ef4f7a7db8a628941794687432ba0420eb956fdc0ba6f598');
  assert.equal(generatedPack.finalVideo.receiptDigest, '56ff8a2f3f8738facb7e86c656159e7c149036abf324f82a48e82881e8359be5');
  assert.equal(generatedPack.finalVideo.renderCommandManifestSha256, 'b3a0f5c823af4be875510d27ebbd65dc6de9907463d1b9e10eea682397060991');
  assert.equal(generatedPack.checks.length, 10);
  assert.ok(generatedPack.checks.every((item) => item.verdict === null && item.note === null));
  assert.equal(generatedPack.officialReviewCreated, false);
  assert.equal(generatedPack.publicationAllowed, false);
});
