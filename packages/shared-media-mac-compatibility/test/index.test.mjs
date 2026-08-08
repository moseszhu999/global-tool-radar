import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMediaRenderRequestV1,
} from '../../shared-media-render-contract/src/index.mjs';
import {
  MAC_REMOTION_RUNTIME_SCHEMA_V1,
  SHARED_MEDIA_MAC_BINDING_V1,
  computeMacPreMaterializedBindingDigestV1,
  createMacPreMaterializedBindingV1,
  createMacRenderExistingRequestV1,
  createSharedMediaMacTransportAdapterV1,
  normalizeMacTransportSnapshotV1,
  validateMacPreMaterializedBindingV1,
} from '../src/index.mjs';

const assetSha = 'a'.repeat(64);

const requestFixture = (overrides = {}) => createMediaRenderRequestV1({
  requestId: 'request-001',
  purpose: 'course.explainer',
  title: 'Product-neutral explainer',
  language: 'zh-CN',
  shots: [
    {
      shotId: 'shot-01',
      order: 1,
      durationMs: 4000,
      narration: {mode: 'text', text: '第一段。'},
      visualAssetIds: ['visual-01'],
    },
    {
      shotId: 'shot-02',
      order: 2,
      durationMs: 3000,
      narration: {mode: 'text', text: '第二段。'},
      visualAssetIds: [],
    },
  ],
  visualAssets: [
    {
      assetId: 'visual-01',
      kind: 'graphic',
      locator: 'media://inputs/visual-01.png',
      mediaType: 'image/png',
      sha256: assetSha,
    },
  ],
  voice: {mode: 'none'},
  captions: {mode: 'none', format: 'none'},
  outputProfile: {
    profileId: 'vertical-standard',
    width: 1080,
    height: 1920,
    fps: 30,
    container: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
  },
  ...overrides,
});

const bindingInput = (request, overrides = {}) => ({
  status: 'approved_pre_materialized',
  bindingId: 'binding:course-explainer-v1',
  inputManifestDigest: request.inputManifestDigest,
  projectName: 'shared-media-course-explainer',
  compositionId: 'CourseExplainer',
  brief: 'Render the already reviewed pre-materialized composition for this exact media input manifest.',
  designNotes: 'Do not reinterpret the source brief during this render-existing execution.',
  audio: false,
  expectedDurationSeconds: 7,
  expectedOutputProfile: structuredClone(request.outputProfile),
  runtimeEvidence: {
    serverMjsSha256: MAC_REMOTION_RUNTIME_SCHEMA_V1.serverMjsSha256,
    openapiSha256: MAC_REMOTION_RUNTIME_SCHEMA_V1.openapiSha256,
  },
  evidenceRefs: [
    'training-learning-rails#615:mac-openapi-schema',
    'training-learning-rails#618:mac-field-use-audit',
    'shared-media-review:pre-materialized-project-v1',
  ],
  ...overrides,
});

const bindingFixture = (request = requestFixture(), overrides = {}) => createMacPreMaterializedBindingV1(
  bindingInput(request, overrides),
);

const fakeClient = () => {
  const calls = {submit: [], status: [], cancel: []};
  return {
    calls,
    async submitRenderJob(body) {
      calls.submit.push(structuredClone(body));
      return {id: 'job-001', status: 'queued'};
    },
    async getRenderJobStatus(jobId) {
      calls.status.push(jobId);
      return {id: jobId, status: 'completed', downloadUrl: '/v1/jobs/job-001/download'};
    },
    async cancelRenderJob(jobId) {
      calls.cancel.push(jobId);
      return {id: jobId, status: 'cancelled'};
    },
  };
};

const allowAllAuthorizers = () => ({
  async isBindingAuthorized() {
    return true;
  },
  async isJobAuthorized() {
    return true;
  },
});

const adapterFixture = (client, overrides = {}) => createSharedMediaMacTransportAdapterV1({
  client,
  ...allowAllAuthorizers(),
  ...overrides,
});

test('approved pre-materialized binding receives a deterministic integrity digest', () => {
  const request = requestFixture();
  const binding = bindingFixture(request);
  assert.equal(binding.schemaVersion, SHARED_MEDIA_MAC_BINDING_V1);
  assert.match(binding.integrityDigest, /^[a-f0-9]{64}$/);
  assert.equal(binding.integrityDigest, computeMacPreMaterializedBindingDigestV1(binding));
  assert.equal(validateMacPreMaterializedBindingV1(binding), true);
});

test('tampering any immutable binding field fails integrity validation', () => {
  const binding = structuredClone(bindingFixture());
  binding.compositionId = 'OtherComposition';
  assert.throws(() => validateMacPreMaterializedBindingV1(binding), /integrityDigest does not match/);
});

test('valid canonical request maps only to audited render_existing transport fields', () => {
  const request = requestFixture();
  const binding = bindingFixture(request);
  const transport = createMacRenderExistingRequestV1({request, binding});
  assert.deepEqual(transport, {
    brief: binding.brief,
    projectName: binding.projectName,
    compositionId: binding.compositionId,
    mode: 'render_existing',
    width: 1080,
    height: 1920,
    fps: 30,
    durationSeconds: 7,
    audio: false,
    outputName: 'request-001.mp4',
    designNotes: binding.designNotes,
  });
  assert.equal('projectDir' in transport, false);
  assert.equal(JSON.stringify(transport).includes('create_or_update'), false);
});

test('binding for another inputManifestDigest fails before transport mapping', () => {
  const request = requestFixture();
  const other = requestFixture({title: 'Different render input'});
  const binding = bindingFixture(other);
  assert.throws(
    () => createMacRenderExistingRequestV1({request, binding}),
    /does not match this canonical inputManifestDigest/,
  );
});

test('canonical request without complete shot timing cannot use render_existing compatibility', () => {
  const request = requestFixture({
    shots: [
      {shotId: 'shot-01', order: 1, narration: {mode: 'text', text: '无固定时长。'}, visualAssetIds: ['visual-01']},
    ],
  });
  const binding = bindingFixture(request, {expectedDurationSeconds: 1});
  assert.throws(
    () => createMacRenderExistingRequestV1({request, binding}),
    /durationMs is required/,
  );
});

test('canonical fractional fps is rejected because audited Mac schema requires integer fps', () => {
  const request = requestFixture({
    outputProfile: {
      profileId: 'film-like', width: 1080, height: 1920, fps: 29.97, container: 'mp4', videoCodec: 'h264', audioCodec: 'aac',
    },
  });
  const binding = bindingFixture(request);
  assert.throws(
    () => createMacRenderExistingRequestV1({request, binding}),
    /fps must be an integer/,
  );
});

test('pre-materialized output profile must exactly equal the canonical profile', () => {
  const request = requestFixture();
  const binding = bindingFixture(request, {
    expectedOutputProfile: {...request.outputProfile, videoCodec: 'vp9'},
  });
  assert.throws(
    () => createMacRenderExistingRequestV1({request, binding}),
    /output profile does not exactly match/,
  );
});

test('binding against an unaudited Mac server source identity fails closed', () => {
  const request = requestFixture();
  assert.throws(
    () => createMacPreMaterializedBindingV1(bindingInput(request, {
      runtimeEvidence: {
        serverMjsSha256: 'b'.repeat(64),
        openapiSha256: MAC_REMOTION_RUNTIME_SCHEMA_V1.openapiSha256,
      },
    })),
    /server\.mjs identity does not match/,
  );
});

test('binding cannot smuggle consumer-domain ownership fields', () => {
  const request = requestFixture();
  assert.throws(
    () => createMacPreMaterializedBindingV1({...bindingInput(request), courseId: 'forbidden'}),
    /courseId is not supported|outside media\.render\.v1/,
  );
});

test('explicit output name is bounded and invalid path-like values are rejected', () => {
  const request = requestFixture();
  const binding = bindingFixture(request);
  assert.equal(
    createMacRenderExistingRequestV1({request, binding, outputName: 'artifact-001.mp4'}).outputName,
    'artifact-001.mp4',
  );
  assert.throws(
    () => createMacRenderExistingRequestV1({request, binding, outputName: '../escape.mp4'}),
    /unsupported characters/,
  );
});

test('Mac completed transport status is not upgraded to canonical media.render.v1 succeeded', () => {
  const receipt = normalizeMacTransportSnapshotV1({id: 'job-001', status: 'completed', downloadUrl: '/download'});
  assert.equal(receipt.transportStatus, 'completed');
  assert.equal(receipt.transportTerminal, true);
  assert.equal(receipt.canonicalResultReady, false);
  assert.equal(receipt.canonicalEvidenceCollected, false);
  assert.equal(receipt.artifactInspectionPerformed, false);
  assert.equal(receipt.renderLogEvidenceCollected, false);
  assert.equal('status' in receipt, false);
  assert.equal('publicationPerformed' in receipt, false);
});

test('unknown Mac transport status fails closed', () => {
  assert.throws(
    () => normalizeMacTransportSnapshotV1({id: 'job-001', status: 'mysterious'}),
    /unsupported Mac render status/,
  );
});

test('adapter construction requires both external authorizers', () => {
  const client = fakeClient();
  assert.throws(
    () => createSharedMediaMacTransportAdapterV1({client}),
    /isBindingAuthorized must be a function/,
  );
  assert.throws(
    () => createSharedMediaMacTransportAdapterV1({client, isBindingAuthorized: async () => true}),
    /isJobAuthorized must be a function/,
  );
});

test('adapter submits exactly one audited render_existing request after binding authorization passes', async () => {
  const request = requestFixture();
  const binding = bindingFixture(request);
  const client = fakeClient();
  const adapter = adapterFixture(client);
  const receipt = await adapter.submitPreMaterializedRender({request, binding});
  assert.equal(client.calls.submit.length, 1);
  assert.equal(client.calls.submit[0].mode, 'render_existing');
  assert.equal('projectDir' in client.calls.submit[0], false);
  assert.equal(receipt.renderSubmissionPerformed, true);
  assert.equal(receipt.requestId, request.requestId);
  assert.equal(receipt.inputManifestDigest, request.inputManifestDigest);
  assert.equal(receipt.bindingId, binding.bindingId);
  assert.equal(receipt.canonicalResultReady, false);
  assert.equal(receipt.consumerDomainDecisionInferred, false);
  assert.equal(receipt.consumerDomainMutationInferred, false);
  assert.equal('publicationPerformed' in receipt, false);
});

test('binding authorization denial occurs before submitRenderJob', async () => {
  const request = requestFixture();
  const binding = bindingFixture(request);
  const client = fakeClient();
  const adapter = adapterFixture(client, {isBindingAuthorized: async () => false});
  await assert.rejects(
    () => adapter.submitPreMaterializedRender({request, binding}),
    /binding is not authorized for render submission/,
  );
  assert.equal(client.calls.submit.length, 0);
});

test('adapter validation failure occurs before binding authorization and submitRenderJob', async () => {
  const request = requestFixture();
  const other = requestFixture({title: 'Different input'});
  const binding = bindingFixture(other);
  const client = fakeClient();
  let bindingAuthorizationCalls = 0;
  const adapter = adapterFixture(client, {
    isBindingAuthorized: async () => {
      bindingAuthorizationCalls += 1;
      return true;
    },
  });
  await assert.rejects(
    () => adapter.submitPreMaterializedRender({request, binding}),
    /does not match this canonical inputManifestDigest/,
  );
  assert.equal(bindingAuthorizationCalls, 0);
  assert.equal(client.calls.submit.length, 0);
});

test('status authorization denial occurs before getRenderJobStatus', async () => {
  const client = fakeClient();
  const adapter = adapterFixture(client, {
    isJobAuthorized: async ({action}) => action !== 'read_status',
  });
  await assert.rejects(
    () => adapter.getTransportStatus({runnerJobId: 'job-001'}),
    /render job is not authorized for status read/,
  );
  assert.deepEqual(client.calls.status, []);
});

test('cancel authorization denial occurs before cancelRenderJob', async () => {
  const client = fakeClient();
  const adapter = adapterFixture(client, {
    isJobAuthorized: async ({action}) => action !== 'cancel',
  });
  await assert.rejects(
    () => adapter.cancelTransportJob({runnerJobId: 'job-001'}),
    /render job is not authorized for cancellation/,
  );
  assert.deepEqual(client.calls.cancel, []);
});

test('status and cancel methods reuse only the existing Mac runner client surface after job authorization passes', async () => {
  const client = fakeClient();
  const adapter = adapterFixture(client);
  const status = await adapter.getTransportStatus({runnerJobId: 'job-001'});
  const cancelled = await adapter.cancelTransportJob({runnerJobId: 'job-001'});
  assert.deepEqual(client.calls.status, ['job-001']);
  assert.deepEqual(client.calls.cancel, ['job-001']);
  assert.equal(status.transportStatus, 'completed');
  assert.equal(status.canonicalResultReady, false);
  assert.equal(cancelled.transportStatus, 'cancelled');
  assert.equal(cancelled.canonicalResultReady, false);
});

test('binding and transport outputs contain no credential or consumer-approval vocabulary', () => {
  const request = requestFixture();
  const binding = bindingFixture(request);
  const transport = createMacRenderExistingRequestV1({request, binding});
  const serialized = JSON.stringify({binding, transport});
  for (const forbidden of ['Authorization', 'Bearer ', 'ACTION_TOKEN', 'humanApproved', 'publicationAllowed', 'socialPlatformBusinessFitApprovedByHuman']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});