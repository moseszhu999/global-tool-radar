import assert from 'node:assert/strict';
import test from 'node:test';

import {createMediaRenderRequestV1} from '../../shared-media-render-contract/src/index.mjs';
import {
  REMOTION_REFERENCE_RUNTIME_V1,
  SHARED_MEDIA_REMOTION_COMPOSITION_ID,
  SHARED_MEDIA_REMOTION_MATERIALIZATION_V1,
  computeGeneratedFilesManifestSha256V1,
  materializeSharedMediaRemotionSmokeV1,
  validateSharedMediaRemotionMaterializationCandidateV1,
  verifyCandidateAgainstRequestV1,
  verifyObservedMaterializedFilesV1,
} from '../src/index.mjs';

const requestFixture = (overrides = {}) => createMediaRenderRequestV1({
  requestId: 'smoke-request-001',
  purpose: 'infra.smoke',
  title: 'Blank technical render smoke',
  language: 'en',
  shots: [
    {shotId: 'shot-01', order: 1, durationMs: 4000, narration: {mode: 'none'}, visualAssetIds: []},
    {shotId: 'shot-02', order: 2, durationMs: 3000, narration: {mode: 'none'}, visualAssetIds: []},
  ],
  visualAssets: [],
  voice: {mode: 'none'},
  captions: {mode: 'none', format: 'none'},
  outputProfile: {profileId: 'smoke-portrait', width: 1080, height: 1920, fps: 30, container: 'mp4'},
  ...overrides,
});

const candidateFixture = (overrides = {}) => materializeSharedMediaRemotionSmokeV1(requestFixture(overrides));
const cloneCandidate = (candidate = candidateFixture()) => structuredClone(candidate);

test('blank canonical smoke request materializes deterministic three-file Remotion candidate', () => {
  const candidate = candidateFixture();
  assert.equal(candidate.schemaVersion, SHARED_MEDIA_REMOTION_MATERIALIZATION_V1);
  assert.equal(candidate.compositionId, SHARED_MEDIA_REMOTION_COMPOSITION_ID);
  assert.deepEqual(candidate.files.map((file) => file.path), ['shared-media-materialization.json', 'src/index.ts', 'src/root.tsx']);
  assert.equal(candidate.generatedFileManifest.length, 3);
  assert.match(candidate.generatedFilesManifestSha256, /^[a-f0-9]{64}$/);
  assert.match(candidate.candidateDigest, /^[a-f0-9]{64}$/);
  assert.equal(validateSharedMediaRemotionMaterializationCandidateV1(candidate), true);
});

test('same canonical request produces byte-identical deterministic candidate', () => {
  const first = candidateFixture(); const second = candidateFixture();
  assert.equal(first.candidateDigest, second.candidateDigest);
  assert.equal(first.generatedFilesManifestSha256, second.generatedFilesManifestSha256);
  assert.deepEqual(first.files, second.files);
});

test('semantically equal output profile with different key insertion order produces same candidate', () => {
  const first = candidateFixture();
  const second = candidateFixture({outputProfile: {container: 'mp4', fps: 30, height: 1920, width: 1080, profileId: 'smoke-portrait'}});
  assert.equal(first.inputManifestDigest, second.inputManifestDigest);
  assert.equal(first.candidateDigest, second.candidateDigest);
  assert.deepEqual(first.files, second.files);
});

test('different canonical input manifest produces different project and candidate digests', () => {
  const first = candidateFixture(); const second = candidateFixture({title: 'Different blank smoke'});
  assert.notEqual(first.inputManifestDigest, second.inputManifestDigest);
  assert.notEqual(first.projectName, second.projectName);
  assert.notEqual(first.candidateDigest, second.candidateDigest);
});

test('generated root embeds exact frame segments and audited composition geometry', () => {
  const candidate = candidateFixture();
  const root = candidate.files.find((file) => file.path === 'src/root.tsx').content;
  assert.match(root, /\[{"from":0,"durationInFrames":120},{"from":120,"durationInFrames":90}\]/);
  assert.match(root, /id="SharedMediaRenderV1"/);
  assert.match(root, /durationInFrames=\{210\}/);
  assert.match(root, /fps=\{30\}/);
  assert.match(root, /width=\{1080\}/);
  assert.match(root, /height=\{1920\}/);
  assert.match(root, /backgroundColor: '#000000'/);
});

test('materialization marker ties project to exact canonical input digest without authorization claim', () => {
  const candidate = candidateFixture();
  const marker = JSON.parse(candidate.files.find((file) => file.path === 'shared-media-materialization.json').content);
  assert.equal(marker.inputManifestDigest, candidate.inputManifestDigest);
  assert.equal(marker.projectName, candidate.projectName);
  assert.equal(marker.compositionId, candidate.compositionId);
  assert.deepEqual(marker.segmentFrames, candidate.segmentFrames);
  assert.equal(marker.expectedTotalFrames, 210);
  assert.equal(marker.renderAuthorized, false);
  assert.equal(marker.bindingCreated, false);
  assert.equal(marker.consumerDomainDecisionInferred, false);
  assert.equal(marker.businessOutcomeInferred, false);
});

test('candidate pins only the audited reference runtime requirements and does not claim props injection', () => {
  const candidate = candidateFixture();
  assert.deepEqual(candidate.runtimeRequirements, REMOTION_REFERENCE_RUNTIME_V1);
  assert.equal(candidate.runtimeRequirements.dependencyVersions.remotion, '4.0.506');
  assert.equal(candidate.runtimeRequirements.dependencyVersions['@remotion/cli'], '4.0.506');
  assert.equal(candidate.runtimeRequirements.dependencyVersions.react, '19.2.3');
  assert.equal(candidate.runtimeRequirements.runtimePropsInjectionProven, false);
  assert.equal(candidate.runtimeRequirements.npmInstallPathProven, false);
  assert.equal(candidate.runtimeRequirements.npxPathProven, false);
});

test('candidate never grants render authorization or creates an approved binding', () => {
  const candidate = candidateFixture();
  assert.equal(candidate.renderAuthorized, false);
  assert.equal(candidate.bindingCreated, false);
  const serialized = JSON.stringify(candidate);
  assert.equal(serialized.includes('approved_pre_materialized'), false);
  assert.equal(serialized.includes('createMacPreMaterializedBindingV1'), false);
});

test('visual assets and shot asset references are outside blank smoke subset', () => {
  const asset = {assetId: 'visual-01', kind: 'image', locator: 'media://visual-01.png', mediaType: 'image/png', sha256: 'a'.repeat(64)};
  assert.throws(() => candidateFixture({visualAssets: [asset], shots: [{shotId: 'shot-01', order: 1, durationMs: 1000, narration: {mode: 'none'}, visualAssetIds: ['visual-01']}]}), /does not support visualAssets/);
});

test('narration text is outside blank smoke subset', () => {
  assert.throws(() => candidateFixture({shots: [{shotId: 'shot-01', order: 1, durationMs: 1000, narration: {mode: 'text', text: 'Do not materialize creative content in smoke v1.'}, visualAssetIds: []}]}), /requires narration.mode=none/);
});

test('voice and caption generation are outside blank smoke subset', () => {
  assert.throws(() => candidateFixture({voice: {mode: 'synthesize', provider: 'example', voiceId: 'v1'}}), /requires voice.mode=none/);
  assert.throws(() => candidateFixture({captions: {mode: 'auto', format: 'burn-in'}}), /requires captions none\/none/);
});

test('blank smoke subset rejects explicit video and audio codec claims', () => {
  assert.throws(() => candidateFixture({outputProfile: {...requestFixture().outputProfile, videoCodec: 'h264'}}), /videoCodec to be omitted/);
  assert.throws(() => candidateFixture({outputProfile: {...requestFixture().outputProfile, audioCodec: 'aac'}}), /audioCodec to be omitted/);
});

test('blank smoke subset rejects non-mp4 and fractional fps', () => {
  assert.throws(() => candidateFixture({outputProfile: {...requestFixture().outputProfile, container: 'webm'}}), /requires mp4 container/);
  assert.throws(() => candidateFixture({outputProfile: {...requestFixture().outputProfile, fps: 29.97}}), /fps must be integer/);
});

test('unknown output-affecting request, shot or profile fields fail closed', () => {
  assert.throws(() => candidateFixture({renderIntent: 'unknown'}), /renderIntent is not supported/);
  assert.throws(() => candidateFixture({shots: [{shotId: 'shot-01', order: 1, durationMs: 1000, narration: {mode: 'none'}, visualAssetIds: [], transition: 'fade'}]}), /transition is not supported/);
  assert.throws(() => candidateFixture({outputProfile: {...requestFixture().outputProfile, colorSpace: 'bt709'}}), /colorSpace is not supported/);
});

test('shot duration must map exactly to integer frames', () => {
  assert.throws(() => candidateFixture({shots: [{shotId: 'shot-01', order: 1, durationMs: 1001, narration: {mode: 'none'}, visualAssetIds: []}]}), /exact integer frame count/);
});

test('missing shot duration is rejected before project generation', () => {
  assert.throws(() => candidateFixture({shots: [{shotId: 'shot-01', order: 1, narration: {mode: 'none'}, visualAssetIds: []}]}), /requires positive durationMs/);
});

test('unsafe or credential-shaped request id is rejected before persistence', () => {
  assert.throws(() => candidateFixture({requestId: '../escape'}), /safe non-secret identifier/);
  assert.throws(() => candidateFixture({requestId: 'token=secret-value'}), /safe non-secret identifier/);
});

test('generated file manifest recomputes to the candidate manifest digest', () => {
  const candidate = candidateFixture();
  assert.equal(computeGeneratedFilesManifestSha256V1(candidate.generatedFileManifest), candidate.generatedFilesManifestSha256);
});

test('candidate validation rejects semantic or generated-source tampering', () => {
  const runtimeTamper = cloneCandidate();
  runtimeTamper.runtimeRequirements.dependencyVersions.remotion = '9.9.9';
  assert.throws(() => validateSharedMediaRemotionMaterializationCandidateV1(runtimeTamper), /runtimeRequirements differ/);

  const frameTamper = cloneCandidate();
  frameTamper.segmentFrames[1].from = 119;
  assert.throws(() => validateSharedMediaRemotionMaterializationCandidateV1(frameTamper), /contiguous from zero/);

  const sourceTamper = cloneCandidate();
  sourceTamper.files.find((file) => file.path === 'src/root.tsx').content += '\n\/\/ tampered\n';
  assert.throws(() => validateSharedMediaRemotionMaterializationCandidateV1(sourceTamper), /generated files do not match deterministic candidate semantics/);
});

test('candidate validation rejects authorization or binding claims', () => {
  for (const field of ['renderAuthorized', 'bindingCreated']) {
    const candidate = cloneCandidate(); candidate[field] = true;
    assert.throws(() => validateSharedMediaRemotionMaterializationCandidateV1(candidate), /cannot claim authorization, binding or domain outcomes/);
  }
});

test('candidate must independently match the exact canonical request before staging approval', () => {
  const request = requestFixture(); const candidate = materializeSharedMediaRemotionSmokeV1(request);
  assert.equal(verifyCandidateAgainstRequestV1(candidate, request), true);
  assert.throws(() => verifyCandidateAgainstRequestV1(candidate, requestFixture({title: 'Different request'})), /does not match the exact canonical request/);
});

test('observed generated-file manifest must exactly match candidate before later binding approval', () => {
  const candidate = candidateFixture(); const observed = candidate.generatedFileManifest.map((record) => ({...record}));
  assert.equal(verifyObservedMaterializedFilesV1(candidate, observed), true);
  observed[0].sha256 = 'b'.repeat(64);
  assert.throws(() => verifyObservedMaterializedFilesV1(candidate, observed), /do not exactly match candidate/);
});

test('candidate and nested generated artifacts are deeply frozen', () => {
  const candidate = candidateFixture();
  assert.equal(Object.isFrozen(candidate), true);
  assert.equal(Object.isFrozen(candidate.segmentFrames), true);
  assert.equal(Object.isFrozen(candidate.segmentFrames[0]), true);
  assert.equal(Object.isFrozen(candidate.files), true);
  assert.equal(Object.isFrozen(candidate.files[0]), true);
  assert.equal(Object.isFrozen(candidate.generatedFileManifest), true);
  assert.equal(Object.isFrozen(candidate.runtimeRequirements), true);
  assert.throws(() => { candidate.renderAuthorized = true; }, TypeError);
});

test('generated project is product-neutral and contains no ToolRadar or TrainingOS domain vocabulary', () => {
  const candidate = candidateFixture(); const generated = candidate.files.map((file) => file.content).join('\n');
  for (const forbidden of ['ToolRadar', 'GLOBAL TOOL RADAR', 'TrainingOS', 'courseId', 'studentId', 'teacherId', 'humanApproved', 'publicationAllowed', 'analyticsObserved']) assert.equal(generated.includes(forbidden), false);
});