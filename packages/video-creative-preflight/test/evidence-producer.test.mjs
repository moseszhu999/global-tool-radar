import test from 'node:test';
import assert from 'node:assert/strict';
import {produceCreativeGateEvidence, validateCreativeGateEvidence} from '../src/evidence-producer.mjs';

const sha = (char) => char.repeat(64);

const validInput = () => ({
  gate: {
    gateType: 'art',
    checks: {
      silhouetteReadable: {result: true, sourceType: 'artifact_metadata', sourceRef: 'styleframe://sf-01'},
      visualHierarchyClear: {result: true, sourceType: 'reviewer_attestation', sourceRef: 'review://rv-01'},
    },
  },
  artifact: {
    artifactType: 'styleframe',
    artifactDigest: sha('a'),
    artifactRef: 'artifact://styleframe-01',
  },
  producer: 'toolradar.creative-evidence-producer.v1',
});

test('produces digest-bound evidence without claiming human approval', () => {
  const evidence = produceCreativeGateEvidence(validInput());
  assert.equal(evidence.schemaVersion, 'toolradar.video-creative-gate-evidence.v1');
  assert.equal(evidence.passed, true);
  assert.equal(evidence.humanCreativeApprovalClaimed, false);
  assert.equal(evidence.publicationAllowed, false);
  assert.equal(validateCreativeGateEvidence(evidence), true);
});

test('preserves a failed check as explicit evidence', () => {
  const input = validInput();
  input.gate.checks.visualHierarchyClear.result = false;
  const evidence = produceCreativeGateEvidence(input);
  assert.equal(evidence.passed, false);
  assert.equal(validateCreativeGateEvidence(evidence), true);
});

test('rejects empty evidence gates', () => {
  const input = validInput();
  input.gate.checks = {};
  assert.throws(() => produceCreativeGateEvidence(input), /at least one check/);
});

test('rejects unsupported provenance', () => {
  const input = validInput();
  input.gate.checks.silhouetteReadable.sourceType = 'model_guess';
  assert.throws(() => produceCreativeGateEvidence(input), /sourceType is unsupported/);
});

test('rejects secret-bearing evidence', () => {
  const input = validInput();
  input.gate.checks.visualHierarchyClear.apiKey = 'should-never-enter-evidence';
  assert.throws(() => produceCreativeGateEvidence(input), /must not contain secret fields/);
});

test('rejects tampered digest', () => {
  const evidence = produceCreativeGateEvidence(validInput());
  assert.throws(() => validateCreativeGateEvidence({...evidence, evidenceDigest: sha('b')}), /digest mismatch/);
});
