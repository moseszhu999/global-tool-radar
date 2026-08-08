import {createHash} from 'node:crypto';

import {
  MEDIA_RENDER_V1,
  assertNoForbiddenDomainFieldsV1,
  sha256CanonicalJsonV1,
  validateMediaRenderRequestV1,
} from '../../shared-media-render-contract/src/index.mjs';

export const SHARED_MEDIA_REMOTION_MATERIALIZATION_V1 = 'shared-media.remotion-materialization-candidate.v1';
export const SHARED_MEDIA_REMOTION_MATERIALIZER_VERSION = '1.0.0';
export const SHARED_MEDIA_REMOTION_COMPOSITION_ID = 'SharedMediaRenderV1';

export const REMOTION_REFERENCE_RUNTIME_V1 = Object.freeze({
  schemaVersion: 'shared-media.remotion-reference-runtime.v1',
  referenceProjectName: 'mac-remotion-connected',
  referenceSourceManifestSha256: '068da049c4b0b2a795e6b91de1cca47ca290d7aced4ab8a8f4b09baf6c805561',
  layoutAudit: Object.freeze({
    repository: 'moseszhu999/training-learning-rails',
    carrierPr: 633,
    runId: 31254844201,
    jobId: 93096608745,
  }),
  entryPath: 'src/index.ts',
  dependencyVersions: Object.freeze({
    remotion: '4.0.506',
    '@remotion/cli': '4.0.506',
    react: '19.2.3',
    'react-dom': '19.2.3',
  }),
  runtimePropsInjectionProven: false,
  npmInstallPathProven: false,
  npxPathProven: false,
});

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const SHA = /^[a-f0-9]{64}$/;
const SECRET_TEXT = /(?:bearer\s+[A-Za-z0-9._~+\/-]+|(?:token|secret|password|api[_-]?key)\s*[:=]\s*\S+)/i;
const FILE_PATHS = Object.freeze(['shared-media-materialization.json', 'src/index.ts', 'src/root.tsx']);

export class SharedMediaRemotionMaterializerError extends TypeError {
  constructor(code, message, {path = null} = {}) {
    super(message);
    this.name = 'SharedMediaRemotionMaterializerError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, message, path = null) => {
  throw new SharedMediaRemotionMaterializerError(code, message, {path});
};

const object = (value, path) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_FIELD', `${path} must be an object`, path);
  return value;
};

const text = (value, path, {max = 1000} = {}) => {
  if (typeof value !== 'string' || value.trim() === '') fail('INVALID_FIELD', `${path} must be non-empty`, path);
  const normalized = value.trim();
  if (normalized.length > max) fail('INVALID_FIELD', `${path} is too long`, path);
  return normalized;
};

const exactKeys = (value, allowed, path) => {
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail('UNSUPPORTED_FIELD', `${path}.${key} is not supported`, `${path}.${key}`);
};

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value) || ArrayBuffer.isView(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return value;
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const fileRecord = (path, content) => {
  const bytes = Buffer.byteLength(content, 'utf8');
  return Object.freeze({path, sha256: sha256(Buffer.from(content, 'utf8')), byteLength: bytes});
};

const computeGeneratedFilesManifestSha256 = (records) => {
  const hash = createHash('sha256');
  for (const record of [...records].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(record.path); hash.update('\0');
    hash.update(record.sha256); hash.update('\0');
    hash.update(String(record.byteLength)); hash.update('\n');
  }
  return hash.digest('hex');
};

const canonicalProjectName = (digest) => `shared-media-${digest.slice(0, 16)}`;

const validateSmokeSubset = (request) => {
  validateMediaRenderRequestV1(request);
  const requestId = text(request.requestId, '$.requestId', {max: 200});
  if (!SAFE_ID.test(requestId) || SECRET_TEXT.test(requestId)) {
    fail('SMOKE_SUBSET_UNSUPPORTED', '$.requestId must be a safe non-secret identifier for persisted smoke materialization', '$.requestId');
  }
  if (request.visualAssets.length !== 0) {
    fail('SMOKE_SUBSET_UNSUPPORTED', 'v1 smoke materializer does not support visualAssets', '$.visualAssets');
  }
  if (request.voice.mode !== 'none') {
    fail('SMOKE_SUBSET_UNSUPPORTED', 'v1 smoke materializer requires voice.mode=none', '$.voice.mode');
  }
  if (request.captions.mode !== 'none' || request.captions.format !== 'none') {
    fail('SMOKE_SUBSET_UNSUPPORTED', 'v1 smoke materializer requires captions none/none', '$.captions');
  }
  const profile = request.outputProfile;
  if (profile.container !== 'mp4') fail('SMOKE_SUBSET_UNSUPPORTED', 'v1 smoke materializer requires mp4 container', '$.outputProfile.container');
  if (profile.videoCodec !== undefined) fail('SMOKE_SUBSET_UNSUPPORTED', 'v1 smoke materializer requires videoCodec to be omitted until runtime codec is separately evidenced', '$.outputProfile.videoCodec');
  if (profile.audioCodec !== undefined) fail('SMOKE_SUBSET_UNSUPPORTED', 'v1 smoke materializer requires audioCodec to be omitted because the blank smoke project has no audio track', '$.outputProfile.audioCodec');
  if (!Number.isInteger(profile.width) || profile.width < 320 || profile.width > 7680) fail('SMOKE_SUBSET_UNSUPPORTED', 'width outside audited Mac range 320..7680', '$.outputProfile.width');
  if (!Number.isInteger(profile.height) || profile.height < 240 || profile.height > 4320) fail('SMOKE_SUBSET_UNSUPPORTED', 'height outside audited Mac range 240..4320', '$.outputProfile.height');
  if (!Number.isInteger(profile.fps) || profile.fps < 1 || profile.fps > 120) fail('SMOKE_SUBSET_UNSUPPORTED', 'fps must be integer in audited Mac range 1..120', '$.outputProfile.fps');

  let totalMs = 0;
  let from = 0;
  const segments = [];
  for (let index = 0; index < request.shots.length; index += 1) {
    const shot = request.shots[index];
    if (shot.narration.mode !== 'none') fail('SMOKE_SUBSET_UNSUPPORTED', `shot ${index + 1} requires narration.mode=none`, `$.shots[${index}].narration.mode`);
    if ((shot.visualAssetIds ?? []).length !== 0) fail('SMOKE_SUBSET_UNSUPPORTED', `shot ${index + 1} cannot reference visual assets`, `$.shots[${index}].visualAssetIds`);
    if (!Number.isInteger(shot.durationMs) || shot.durationMs <= 0) fail('SMOKE_SUBSET_UNSUPPORTED', `shot ${index + 1} requires positive durationMs`, `$.shots[${index}].durationMs`);
    const frameNumerator = shot.durationMs * profile.fps;
    if (frameNumerator % 1000 !== 0) {
      fail('SMOKE_SUBSET_UNSUPPORTED', `shot ${index + 1} duration must map to an exact integer frame count`, `$.shots[${index}].durationMs`);
    }
    const durationInFrames = frameNumerator / 1000;
    segments.push(Object.freeze({from, durationInFrames}));
    from += durationInFrames;
    totalMs += shot.durationMs;
  }
  const totalSeconds = totalMs / 1000;
  if (totalSeconds < 1 || totalSeconds > 900) fail('SMOKE_SUBSET_UNSUPPORTED', 'total duration outside audited Mac range 1..900 seconds', '$.shots');
  return Object.freeze({requestId, segments: Object.freeze(segments), totalFrames: from, totalSeconds});
};

const renderIndexSource = () => [
  "import {registerRoot} from 'remotion';",
  "import {SharedMediaRoot} from './root';",
  '',
  'registerRoot(SharedMediaRoot);',
  '',
].join('\n');

const renderRootSource = ({segments, totalFrames, profile}) => {
  const embeddedSegments = JSON.stringify(segments);
  return [
    "import React from 'react';",
    "import {AbsoluteFill, Composition, Sequence} from 'remotion';",
    '',
    `const segments = ${embeddedSegments} as const;`,
    '',
    'const BlankFrame: React.FC = () => (',
    "  <AbsoluteFill style={{backgroundColor: '#000000'}} />",
    ');',
    '',
    'const SharedMediaBlankComposition: React.FC = () => (',
    "  <AbsoluteFill style={{backgroundColor: '#000000'}}>",
    '    {segments.map((segment, index) => (',
    '      <Sequence key={index} from={segment.from} durationInFrames={segment.durationInFrames}>',
    '        <BlankFrame />',
    '      </Sequence>',
    '    ))}',
    '  </AbsoluteFill>',
    ');',
    '',
    'export const SharedMediaRoot: React.FC = () => (',
    '  <Composition',
    `    id="${SHARED_MEDIA_REMOTION_COMPOSITION_ID}"`,
    '    component={SharedMediaBlankComposition}',
    `    durationInFrames={${totalFrames}}`,
    `    fps={${profile.fps}}`,
    `    width={${profile.width}}`,
    `    height={${profile.height}}`,
    '  />',
    ');',
    '',
  ].join('\n');
};

const materializationMarker = ({request, projectName, totalFrames, totalSeconds, segments}) => JSON.stringify({
  schemaVersion: SHARED_MEDIA_REMOTION_MATERIALIZATION_V1,
  contractVersion: MEDIA_RENDER_V1,
  materializerVersion: SHARED_MEDIA_REMOTION_MATERIALIZER_VERSION,
  inputManifestDigest: request.inputManifestDigest,
  projectName,
  compositionId: SHARED_MEDIA_REMOTION_COMPOSITION_ID,
  expectedDurationSeconds: totalSeconds,
  expectedTotalFrames: totalFrames,
  expectedOutputProfile: request.outputProfile,
  segmentFrames: segments,
  renderAuthorized: false,
  bindingCreated: false,
  consumerDomainDecisionInferred: false,
  businessOutcomeInferred: false,
}, null, 2) + '\n';

const candidateDigestPayload = (candidate) => ({
  schemaVersion: candidate.schemaVersion,
  materializerVersion: candidate.materializerVersion,
  requestId: candidate.requestId,
  inputManifestDigest: candidate.inputManifestDigest,
  projectName: candidate.projectName,
  compositionId: candidate.compositionId,
  runtimeRequirements: candidate.runtimeRequirements,
  expectedDurationSeconds: candidate.expectedDurationSeconds,
  expectedTotalFrames: candidate.expectedTotalFrames,
  expectedOutputProfile: candidate.expectedOutputProfile,
  generatedFileManifest: candidate.generatedFileManifest,
  generatedFilesManifestSha256: candidate.generatedFilesManifestSha256,
  renderAuthorized: candidate.renderAuthorized,
  bindingCreated: candidate.bindingCreated,
  consumerDomainDecisionInferred: candidate.consumerDomainDecisionInferred,
  businessOutcomeInferred: candidate.businessOutcomeInferred,
});

export const materializeSharedMediaRemotionSmokeV1 = (request) => {
  const subset = validateSmokeSubset(request);
  const projectName = canonicalProjectName(request.inputManifestDigest);
  const files = [
    {path: 'src/index.ts', content: renderIndexSource()},
    {path: 'src/root.tsx', content: renderRootSource({segments: subset.segments, totalFrames: subset.totalFrames, profile: request.outputProfile})},
    {path: 'shared-media-materialization.json', content: materializationMarker({request, projectName, totalFrames: subset.totalFrames, totalSeconds: subset.totalSeconds, segments: subset.segments})},
  ].sort((a, b) => a.path.localeCompare(b.path));
  const generatedFileManifest = files.map(({path, content}) => fileRecord(path, content));
  const candidate = {
    schemaVersion: SHARED_MEDIA_REMOTION_MATERIALIZATION_V1,
    materializerVersion: SHARED_MEDIA_REMOTION_MATERIALIZER_VERSION,
    requestId: subset.requestId,
    inputManifestDigest: request.inputManifestDigest,
    projectName,
    compositionId: SHARED_MEDIA_REMOTION_COMPOSITION_ID,
    runtimeRequirements: REMOTION_REFERENCE_RUNTIME_V1,
    expectedDurationSeconds: subset.totalSeconds,
    expectedTotalFrames: subset.totalFrames,
    expectedOutputProfile: structuredClone(request.outputProfile),
    files: files.map((file) => Object.freeze({...file})),
    generatedFileManifest,
    generatedFilesManifestSha256: computeGeneratedFilesManifestSha256(generatedFileManifest),
    renderAuthorized: false,
    bindingCreated: false,
    consumerDomainDecisionInferred: false,
    businessOutcomeInferred: false,
  };
  candidate.candidateDigest = sha256CanonicalJsonV1(candidateDigestPayload(candidate));
  assertNoForbiddenDomainFieldsV1(candidate, '$candidate');
  return deepFreeze(candidate);
};

export const validateSharedMediaRemotionMaterializationCandidateV1 = (candidate) => {
  const value = object(candidate, '$candidate');
  exactKeys(value, new Set([
    'schemaVersion','materializerVersion','requestId','inputManifestDigest','projectName','compositionId','runtimeRequirements',
    'expectedDurationSeconds','expectedTotalFrames','expectedOutputProfile','files','generatedFileManifest','generatedFilesManifestSha256',
    'renderAuthorized','bindingCreated','consumerDomainDecisionInferred','businessOutcomeInferred','candidateDigest',
  ]), '$candidate');
  assertNoForbiddenDomainFieldsV1(value, '$candidate');
  if (value.schemaVersion !== SHARED_MEDIA_REMOTION_MATERIALIZATION_V1) fail('INVALID_CANDIDATE', 'unexpected schemaVersion', '$candidate.schemaVersion');
  if (value.materializerVersion !== SHARED_MEDIA_REMOTION_MATERIALIZER_VERSION) fail('INVALID_CANDIDATE', 'unexpected materializerVersion', '$candidate.materializerVersion');
  if (!SAFE_ID.test(text(value.requestId, '$candidate.requestId', {max: 200})) || SECRET_TEXT.test(value.requestId)) fail('INVALID_CANDIDATE', 'unsafe requestId', '$candidate.requestId');
  if (!SHA.test(text(value.inputManifestDigest, '$candidate.inputManifestDigest', {max: 64}))) fail('INVALID_CANDIDATE', 'inputManifestDigest must be SHA-256', '$candidate.inputManifestDigest');
  if (value.projectName !== canonicalProjectName(value.inputManifestDigest)) fail('INVALID_CANDIDATE', 'projectName does not match input manifest digest', '$candidate.projectName');
  if (value.compositionId !== SHARED_MEDIA_REMOTION_COMPOSITION_ID) fail('INVALID_CANDIDATE', 'compositionId mismatch', '$candidate.compositionId');
  if (value.renderAuthorized !== false || value.bindingCreated !== false || value.consumerDomainDecisionInferred !== false || value.businessOutcomeInferred !== false) fail('TRUTH_BOUNDARY', 'candidate cannot claim authorization, binding or domain outcomes', '$candidate');
  if (!Array.isArray(value.files) || !Array.isArray(value.generatedFileManifest) || value.files.length !== FILE_PATHS.length || value.generatedFileManifest.length !== FILE_PATHS.length) fail('INVALID_CANDIDATE', 'unexpected generated file count', '$candidate.files');
  const paths = value.files.map((file) => file.path).sort();
  if (JSON.stringify(paths) !== JSON.stringify([...FILE_PATHS].sort())) fail('INVALID_CANDIDATE', 'generated paths differ from bounded v1 set', '$candidate.files');
  for (const file of value.files) {
    object(file, '$candidate.files[]');
    exactKeys(file, new Set(['path','content']), '$candidate.files[]');
    text(file.content, '$candidate.files[].content', {max: 200_000});
  }
  const recomputed = value.files.map((file) => fileRecord(file.path, file.content)).sort((a, b) => a.path.localeCompare(b.path));
  const expectedManifest = [...value.generatedFileManifest].sort((a, b) => a.path.localeCompare(b.path));
  if (JSON.stringify(recomputed) !== JSON.stringify(expectedManifest)) fail('CANDIDATE_INTEGRITY_MISMATCH', 'generated file manifest does not match file contents', '$candidate.generatedFileManifest');
  if (computeGeneratedFilesManifestSha256(recomputed) !== value.generatedFilesManifestSha256) fail('CANDIDATE_INTEGRITY_MISMATCH', 'generatedFilesManifestSha256 mismatch', '$candidate.generatedFilesManifestSha256');
  if (sha256CanonicalJsonV1(candidateDigestPayload(value)) !== value.candidateDigest) fail('CANDIDATE_INTEGRITY_MISMATCH', 'candidateDigest mismatch', '$candidate.candidateDigest');
  return true;
};

export const verifyObservedMaterializedFilesV1 = (candidate, observedFileManifest) => {
  validateSharedMediaRemotionMaterializationCandidateV1(candidate);
  if (!Array.isArray(observedFileManifest)) fail('INVALID_OBSERVATION', 'observedFileManifest must be an array', '$observedFileManifest');
  const normalized = observedFileManifest.map((record, index) => {
    const value = object(record, `$observedFileManifest[${index}]`);
    exactKeys(value, new Set(['path','sha256','byteLength']), `$observedFileManifest[${index}]`);
    const path = text(value.path, `$observedFileManifest[${index}].path`, {max: 200});
    const digest = text(value.sha256, `$observedFileManifest[${index}].sha256`, {max: 64});
    if (!SHA.test(digest)) fail('INVALID_OBSERVATION', 'observed sha256 invalid', `$observedFileManifest[${index}].sha256`);
    if (!Number.isInteger(value.byteLength) || value.byteLength < 1) fail('INVALID_OBSERVATION', 'observed byteLength invalid', `$observedFileManifest[${index}].byteLength`);
    return {path, sha256: digest, byteLength: value.byteLength};
  }).sort((a, b) => a.path.localeCompare(b.path));
  const expected = [...candidate.generatedFileManifest].map((record) => ({...record})).sort((a, b) => a.path.localeCompare(b.path));
  if (JSON.stringify(normalized) !== JSON.stringify(expected)) fail('MATERIALIZATION_MISMATCH', 'observed generated files do not exactly match candidate', '$observedFileManifest');
  return true;
};

export const computeGeneratedFilesManifestSha256V1 = (records) => computeGeneratedFilesManifestSha256(records);
