import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MediaRenderContractError,
  computeMediaRenderInputManifestDigestV1,
  createMediaRenderRequestV1,
  normalizeMacRemotionStatusV1,
  sha256CanonicalJsonV1,
  stableStringifyV1,
  validateMediaRenderRequestV1,
  validateMediaRenderResultV1,
} from '../src/index.mjs';

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);
const C = 'c'.repeat(64);

const baseInput = () => ({
  requestId: 'request-001',
  purpose: 'course.lesson',
  title: 'Canonical lesson render',
  language: 'zh-CN',
  shots: [
    {shotId: 'shot-01', order: 1, durationMs: 3000, narration: {mode: 'text', text: '第一段旁白'}, visualAssetIds: ['visual-01']},
    {shotId: 'shot-02', order: 2, durationMs: 2500, narration: {mode: 'text', text: '第二段旁白'}, visualAssetIds: []},
  ],
  visualAssets: [
    {assetId: 'visual-01', kind: 'slide', locator: 'media://inputs/slide-01.png', mediaType: 'image/png', sha256: A},
  ],
  voice: {mode: 'synthesize', provider: 'tts-provider', voiceId: 'voice-01', locale: 'zh-CN', rate: 1},
  captions: {mode: 'auto', format: 'burn-in', language: 'zh-CN'},
  outputProfile: {profileId: 'course-standard', width: 1920, height: 1080, fps: 30, container: 'mp4', videoCodec: 'h264', audioCodec: 'aac'},
});

const evidence = (request) => ({
  contractVersion: 'media.render.v1', messageType: 'evidence', requestId: request.requestId, jobId: 'job-001',
  inputManifestDigest: request.inputManifestDigest, artifactSha256: B,
  mediaInspection: {
    tool: 'ffprobe', status: 'passed', toolVersion: '7.1', inspectedAt: '2026-08-07T10:00:00.000Z',
    format: {durationSeconds: 5.5, sizeBytes: 123456, formatName: 'mov,mp4,m4a,3gp,3g2,mj2'},
    streams: [
      {index: 0, type: 'video', codecName: 'h264', width: 1920, height: 1080, frameRate: 30},
      {index: 1, type: 'audio', codecName: 'aac', sampleRate: 48000, channels: 2},
    ],
  },
  renderLog: {sha256: C, locator: 'evidence://job-001/render.log', byteLength: 2048},
  collectedAt: '2026-08-07T10:00:01.000Z',
});

const succeededResult = (request) => ({
  contractVersion: 'media.render.v1', messageType: 'result', requestId: request.requestId, jobId: 'job-001', status: 'succeeded',
  startedAt: '2026-08-07T09:59:00.000Z', finishedAt: '2026-08-07T10:00:01.000Z',
  artifact: {artifactId: 'artifact-001', locator: 'media://outputs/final.mp4', mediaType: 'video/mp4', byteLength: 123456, sha256: B, durationSeconds: 5.5, width: 1920, height: 1080, container: 'mp4', videoCodec: 'h264', audioCodec: 'aac'},
  evidence: evidence(request), error: null,
});

test('creates and validates a canonical media.render.v1 request with immutable input manifest digest', () => {
  const request = createMediaRenderRequestV1(baseInput());
  assert.match(request.inputManifestDigest, /^[a-f0-9]{64}$/);
  assert.equal(request.inputManifestDigest, computeMediaRenderInputManifestDigestV1(request));
  assert.equal(validateMediaRenderRequestV1(request), true);
});

test('canonical JSON digest is independent of object key order', () => {
  assert.equal(stableStringifyV1({b: 2, a: 1}), stableStringifyV1({a: 1, b: 2}));
  assert.equal(sha256CanonicalJsonV1({b: 2, a: 1}), sha256CanonicalJsonV1({a: 1, b: 2}));
});

test('tampering with a shot after digest creation fails closed', () => {
  const request = structuredClone(createMediaRenderRequestV1(baseInput())); request.shots[0].narration.text = 'tampered';
  assert.throws(() => validateMediaRenderRequestV1(request), (error) => error instanceof MediaRenderContractError && error.code === 'MANIFEST_DIGEST_MISMATCH');
});

test('rejects social publishing account fields anywhere in the contract', () => {
  const input = baseInput(); input.publishingAccount = {id: 'should-not-be-here'};
  assert.throws(() => createMediaRenderRequestV1(input), (error) => error.code === 'FORBIDDEN_DOMAIN_FIELD');
});

test('rejects TrainingOS business object IDs anywhere in the contract', () => {
  const input = baseInput(); input.unitId = 'unit-123';
  assert.throws(() => createMediaRenderRequestV1(input), (error) => error.code === 'FORBIDDEN_DOMAIN_FIELD');
});

test('rejects platform growth metrics from render envelopes', () => {
  const input = baseInput(); input.analytics = {views: 1000};
  assert.throws(() => createMediaRenderRequestV1(input), (error) => error.code === 'FORBIDDEN_DOMAIN_FIELD');
});

test('forbidden words in narration text are not mistaken for forbidden fields', () => {
  const input = baseInput(); input.shots[0].narration.text = 'render succeeded does not mean published or human approved';
  assert.equal(validateMediaRenderRequestV1(createMediaRenderRequestV1(input)), true);
});

test('succeeded requires final artifact plus ffprobe/log/SHA/input-manifest evidence', () => {
  const request = createMediaRenderRequestV1(baseInput()); assert.equal(validateMediaRenderResultV1(succeededResult(request), {request}), true);
});

test('succeeded without evidence is rejected', () => {
  const request = createMediaRenderRequestV1(baseInput()); const result = succeededResult(request); result.evidence = null;
  assert.throws(() => validateMediaRenderResultV1(result, {request}), (error) => error.code === 'INVALID_FIELD');
});

test('succeeded evidence must be ffprobe media inspection', () => {
  const request = createMediaRenderRequestV1(baseInput()); const result = succeededResult(request); result.evidence.mediaInspection.tool = 'custom-probe';
  assert.throws(() => validateMediaRenderResultV1(result, {request}), (error) => error.code === 'INVALID_FIELD');
});

test('artifact SHA-256 mismatch against evidence is rejected', () => {
  const request = createMediaRenderRequestV1(baseInput()); const result = succeededResult(request); result.artifact.sha256 = A;
  assert.throws(() => validateMediaRenderResultV1(result, {request}), (error) => error.code === 'EVIDENCE_MISMATCH');
});

test('evidence input manifest must tie back to the exact request inputs', () => {
  const request = createMediaRenderRequestV1(baseInput()); const result = succeededResult(request); result.evidence.inputManifestDigest = A;
  assert.throws(() => validateMediaRenderResultV1(result, {request}), (error) => error.code === 'EVIDENCE_MISMATCH');
});

test('failed result requires an error and cannot claim final artifact', () => {
  const request = createMediaRenderRequestV1(baseInput());
  const failed = {contractVersion: 'media.render.v1', messageType: 'result', requestId: request.requestId, jobId: 'job-002', status: 'failed', artifact: null,
    evidence: {contractVersion: 'media.render.v1', messageType: 'evidence', requestId: request.requestId, jobId: 'job-002', inputManifestDigest: request.inputManifestDigest, artifactSha256: null, mediaInspection: null, renderLog: {sha256: C, locator: 'evidence://job-002/render.log', byteLength: 1024}, collectedAt: '2026-08-07T10:01:00.000Z'},
    error: {code: 'RENDER_FAILED', stage: 'render', message: 'renderer returned non-zero', retryable: true}};
  assert.equal(validateMediaRenderResultV1(failed, {request}), true); failed.artifact = succeededResult(request).artifact;
  assert.throws(() => validateMediaRenderResultV1(failed, {request}), (error) => error.code === 'RESULT_TRUTH_BOUNDARY');
});

test('failed execution evidence must carry render log but cannot claim ffprobe artifact evidence', () => {
  const request = createMediaRenderRequestV1(baseInput());
  const failed = {contractVersion: 'media.render.v1', messageType: 'result', requestId: request.requestId, jobId: 'job-fail', status: 'failed', artifact: null,
    evidence: {contractVersion: 'media.render.v1', messageType: 'evidence', requestId: request.requestId, jobId: 'job-fail', inputManifestDigest: request.inputManifestDigest, artifactSha256: null, mediaInspection: null, renderLog: {sha256: C}, collectedAt: '2026-08-07T10:02:00.000Z'},
    error: {code: 'RENDER_FAILED', stage: 'render', message: 'failed', retryable: false}};
  assert.equal(validateMediaRenderResultV1(failed, {request}), true); failed.evidence.artifactSha256 = B; failed.evidence.mediaInspection = evidence(request).mediaInspection;
  assert.throws(() => validateMediaRenderResultV1(failed, {request}), (error) => error.code === 'RESULT_TRUTH_BOUNDARY');
});

test('succeeded artifact must match requested output profile and ffprobe stream metadata', () => {
  const request = createMediaRenderRequestV1(baseInput()); const result = succeededResult(request); result.artifact.width = 1280; result.evidence.mediaInspection.streams[0].width = 1280;
  assert.throws(() => validateMediaRenderResultV1(result, {request}), (error) => error.code === 'EVIDENCE_MISMATCH');
});

test('queued/running cannot fabricate terminal artifact or evidence', () => {
  const request = createMediaRenderRequestV1(baseInput()); const queued = {contractVersion: 'media.render.v1', messageType: 'result', requestId: request.requestId, jobId: 'job-003', status: 'queued', artifact: null, evidence: null, error: null};
  assert.equal(validateMediaRenderResultV1(queued, {request}), true); queued.artifact = succeededResult(request).artifact;
  assert.throws(() => validateMediaRenderResultV1(queued, {request}), (error) => error.code === 'RESULT_TRUTH_BOUNDARY');
});

test('result cannot carry human approval or publication claims', () => {
  const request = createMediaRenderRequestV1(baseInput()); const result = succeededResult(request); result.humanApproved = true;
  assert.throws(() => validateMediaRenderResultV1(result, {request}), (error) => error.code === 'FORBIDDEN_DOMAIN_FIELD');
});

test('Mac Remotion lifecycle maps without changing the backend engine contract', () => {
  assert.deepEqual(['queued', 'running', 'completed', 'failed', 'cancelled'].map(normalizeMacRemotionStatusV1), ['queued', 'running', 'succeeded', 'failed', 'cancelled']);
  assert.throws(() => normalizeMacRemotionStatusV1('done'), (error) => error.code === 'STATUS_MAPPING_UNSUPPORTED');
});
