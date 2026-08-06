import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {buildReplitDesignVideoProjectLedger} from '../src/index.mjs';
import {validateVideoProject} from '../../video-project-lifecycle/src/index.mjs';

const loadFixtures = async () => Promise.all([
  readFile(new URL('../../../apps/web/data/replit-design-production-case.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../../../apps/web/data/replit-design-storyboard-package.json', import.meta.url), 'utf8').then(JSON.parse),
]);

test('reconstructs the real Replit case at the truthful current blocker', async () => {
  const [productionCase, storyboardPackage] = await loadFixtures();
  const ledger = buildReplitDesignVideoProjectLedger({productionCase, storyboardPackage});
  assert.equal(ledger.project.projectId, 'video-project:aw_nlbkzvyy:v1');
  assert.equal(ledger.project.stage, 'STORYBOARD_READY');
  assert.equal(ledger.project.status, 'BLOCKED');
  assert.equal(ledger.project.nextEvent, 'RESUME_PROJECT');
  assert.match(ledger.project.blockedReason, /asset:test-recording/);
  assert.match(ledger.project.blockedReason, /asset:build-limit-recording/);
  assert.match(ledger.project.blockedReason, /asset:voiceover/);
  assert.equal(validateVideoProject(ledger.project), true);
});

test('binds real topic, production-case and storyboard content digests', async () => {
  const [productionCase, storyboardPackage] = await loadFixtures();
  const ledger = buildReplitDesignVideoProjectLedger({productionCase, storyboardPackage});
  assert.equal(ledger.project.events.length, 5);
  assert.equal(ledger.project.artifacts.length, 3);
  for (const value of Object.values(ledger.sourceDigests)) assert.match(value, /^[a-f0-9]{64}$/);
  assert.equal(ledger.project.artifacts[0].digest, ledger.sourceDigests.topicBriefSha256);
  assert.equal(ledger.project.artifacts[1].digest, ledger.sourceDigests.productionCaseSha256);
  assert.equal(ledger.project.artifacts[2].digest, ledger.sourceDigests.storyboardPackageSha256);
});

test('preserves the real rights, review and publication boundaries', async () => {
  const [productionCase, storyboardPackage] = await loadFixtures();
  const ledger = buildReplitDesignVideoProjectLedger({productionCase, storyboardPackage});
  const productionArtifact = ledger.project.artifacts.find((item) => item.type === 'production_case');
  const storyboardArtifact = ledger.project.artifacts.find((item) => item.type === 'storyboard_package');
  assert.equal(productionArtifact.claims.rightsState, 'needs_review');
  assert.equal(productionArtifact.claims.humanScriptReviewRequired, true);
  assert.equal(productionArtifact.claims.publicationAllowed, false);
  assert.equal(storyboardArtifact.claims.humanCaptureRequired, true);
  assert.equal(storyboardArtifact.claims.renderAllowed, false);
  assert.equal(storyboardArtifact.claims.publicationAllowed, false);
});

test('output is deterministic for unchanged source artifacts', async () => {
  const [productionCase, storyboardPackage] = await loadFixtures();
  const first = buildReplitDesignVideoProjectLedger({productionCase, storyboardPackage});
  const second = buildReplitDesignVideoProjectLedger({productionCase, storyboardPackage});
  assert.deepEqual(second, first);
});

test('fails closed if canonical case identity or storyboard gates change', async () => {
  const [productionCase, storyboardPackage] = await loadFixtures();
  assert.throws(() => buildReplitDesignVideoProjectLedger({
    productionCase: {...productionCase, caseId: 'video-case:other'},
    storyboardPackage,
  }), /unexpected Replit case ID/);
  assert.throws(() => buildReplitDesignVideoProjectLedger({
    productionCase,
    storyboardPackage: {...storyboardPackage, gates: {...storyboardPackage.gates, renderAllowed: true}},
  }), /storyboard gate boundary changed/);
});

test('content digest changes when source content changes', async () => {
  const [productionCase, storyboardPackage] = await loadFixtures();
  const first = buildReplitDesignVideoProjectLedger({productionCase, storyboardPackage});
  const changed = structuredClone(productionCase);
  changed.topicBrief.workingTitle += ' updated';
  const second = buildReplitDesignVideoProjectLedger({productionCase: changed, storyboardPackage});
  assert.notEqual(first.sourceDigests.topicBriefSha256, second.sourceDigests.topicBriefSha256);
  assert.notEqual(first.sourceDigests.productionCaseSha256, second.sourceDigests.productionCaseSha256);
});
