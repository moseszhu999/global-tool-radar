import assert from 'node:assert/strict';
import test from 'node:test';

import {createMediaRenderRequestV1} from '../../shared-media-render-contract/src/index.mjs';
import {
  createSharedMediaEvidenceCollectorV1,
  sha256EvidenceBytesV1,
} from '../src/index.mjs';

const ARTIFACT_BYTES = Buffer.from('bounded-fake-mp4-binary-v1');
const RENDER_LOG = 'render existing completed\nartifact emitted\n';
const NOW = '2026-08-08T10:45:00.000Z';

const requestFixture = (overrides = {}) => createMediaRenderRequestV1({
  requestId: 'request-evidence-001',
  purpose: 'course.explainer',
  title: 'Product-neutral evidence fixture',
  language: 'zh-CN',
  shots: [
    {
      shotId: 'shot-01',
      order: 1,
      durationMs: 7000,
      narration: {mode: 'text', text: '用于证据采集测试。'},
      visualAssetIds: [],
    },
  ],
  visualAssets: [],
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

const inspectionFixture = (overrides = {}) => ({
  tool: 'ffprobe',
  status: 'passed',
  inspectedAt: '2026-08-08T10:44:30.000Z',
  format: {
    durationSeconds: 7,
    sizeBytes: ARTIFACT_BYTES.byteLength,
    container: 'mp4',
  },
  streams: [
    {index: 0, type: 'video', codecName: 'h264', width: 1080, height: 1920, frameRate: 30},
    {index: 1, type: 'audio', codecName: 'aac'},
  ],
  ...overrides,
});

const operationsFixture = (overrides = {}) => {
  const calls = {authorize: [], artifact: [], inspect: [], log: [], now: 0};
  const operations = {
    async isJobAuthorized(input) {
      calls.authorize.push(structuredClone(input));
      return true;
    },
    async readArtifact(input) {
      calls.artifact.push(structuredClone(input));
      return {
        artifactId: 'artifact-001',
        locator: 'media://artifacts/artifact-001.mp4',
        mediaType: 'video/mp4',
        bytes: ARTIFACT_BYTES,
      };
    },
    async inspectArtifact(input) {
      calls.inspect.push({
        ...structuredClone(input),
        bytes: Buffer.from(input.bytes),
      });
      return inspectionFixture();
    },
    async readRenderLog(input) {
      calls.log.push(structuredClone(input));
      return RENDER_LOG;
    },
    now() {
      calls.now += 1;
      return NOW;
    },
    ...overrides,
  };
  return {calls, operations};
};

const collectorFixture = (overrides = {}) => {
  const fixture = operationsFixture(overrides);
  return {
    ...fixture,
    collector: createSharedMediaEvidenceCollectorV1(fixture.operations),
  };
};

test('collector construction requires artifact, inspection, render-log and authorization operations', () => {
  assert.throws(() => createSharedMediaEvidenceCollectorV1(), /readArtifact must be a function/);
  assert.throws(() => createSharedMediaEvidenceCollectorV1({readArtifact: async () => ({})}), /inspectArtifact must be a function/);
  assert.throws(() => createSharedMediaEvidenceCollectorV1({
    readArtifact: async () => ({}),
    inspectArtifact: async () => ({}),
  }), /readRenderLog must be a function/);
  assert.throws(() => createSharedMediaEvidenceCollectorV1({
    readArtifact: async () => ({}),
    inspectArtifact: async () => ({}),
    readRenderLog: async () => '',
  }), /isJobAuthorized must be a function/);
});

test('succeeded collection derives artifact SHA and canonical evidence from exact bytes', async () => {
  const request = requestFixture();
  const {collector, calls} = collectorFixture();
  const result = await collector.collectSucceeded({request, jobId: 'job-001'});

  assert.equal(result.status, 'succeeded');
  assert.equal(result.requestId, request.requestId);
  assert.equal(result.jobId, 'job-001');
  assert.equal(result.evidence.inputManifestDigest, request.inputManifestDigest);
  assert.equal(result.artifact.sha256, sha256EvidenceBytesV1(ARTIFACT_BYTES));
  assert.equal(result.evidence.artifactSha256, result.artifact.sha256);
  assert.equal(result.evidence.renderLog.sha256, sha256EvidenceBytesV1(RENDER_LOG));
  assert.equal(result.evidence.renderLog.byteLength, Buffer.byteLength(RENDER_LOG));
  assert.equal(result.evidence.collectedAt, NOW);
  assert.deepEqual(calls.authorize.map((call) => call.action), ['collect_succeeded_evidence']);
  assert.equal(calls.artifact.length, 1);
  assert.equal(calls.inspect.length, 1);
  assert.equal(calls.log.length, 1);
});

test('succeeded artifact metadata is derived from passed ffprobe inspection', async () => {
  const {collector} = collectorFixture();
  const result = await collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'});
  assert.deepEqual({
    byteLength: result.artifact.byteLength,
    durationSeconds: result.artifact.durationSeconds,
    width: result.artifact.width,
    height: result.artifact.height,
    container: result.artifact.container,
    videoCodec: result.artifact.videoCodec,
    audioCodec: result.artifact.audioCodec,
  }, {
    byteLength: ARTIFACT_BYTES.byteLength,
    durationSeconds: 7,
    width: 1080,
    height: 1920,
    container: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
  });
});

test('job authorization denial occurs before artifact, inspection and render-log reads', async () => {
  const {collector, calls} = collectorFixture({isJobAuthorized: async (input) => {
    calls.authorize.push(structuredClone(input));
    return false;
  }});
  await assert.rejects(
    () => collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'}),
    /job is not authorized for collect_succeeded_evidence/,
  );
  assert.equal(calls.artifact.length, 0);
  assert.equal(calls.inspect.length, 0);
  assert.equal(calls.log.length, 0);
});

test('artifact source cannot supply caller-owned SHA or other undeclared evidence fields', async () => {
  const {collector, calls} = collectorFixture({
    readArtifact: async (input) => {
      calls.artifact.push(structuredClone(input));
      return {
        artifactId: 'artifact-001',
        locator: 'media://artifacts/artifact-001.mp4',
        mediaType: 'video/mp4',
        bytes: ARTIFACT_BYTES,
        sha256: 'a'.repeat(64),
      };
    },
  });
  await assert.rejects(
    () => collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'}),
    /sha256 is not supported/,
  );
  assert.equal(calls.inspect.length, 0);
  assert.equal(calls.log.length, 0);
});

test('empty artifact bytes fail before inspection and render-log reads', async () => {
  const {collector, calls} = collectorFixture({
    readArtifact: async () => ({
      artifactId: 'artifact-001',
      locator: 'media://artifacts/artifact-001.mp4',
      mediaType: 'video/mp4',
      bytes: Buffer.alloc(0),
    }),
  });
  await assert.rejects(
    () => collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'}),
    /bytes must not be empty/,
  );
  assert.equal(calls.inspect.length, 0);
  assert.equal(calls.log.length, 0);
});

test('non-passed ffprobe evidence fails before render-log read', async () => {
  const {collector, calls} = collectorFixture({inspectArtifact: async (input) => {
    calls.inspect.push(structuredClone(input));
    return inspectionFixture({status: 'failed'});
  }});
  await assert.rejects(
    () => collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'}),
    /must be passed ffprobe evidence/,
  );
  assert.equal(calls.log.length, 0);
});

test('inspection without a video stream fails before render-log read', async () => {
  const {collector, calls} = collectorFixture({inspectArtifact: async (input) => {
    calls.inspect.push(structuredClone(input));
    return inspectionFixture({streams: [{index: 0, type: 'audio', codecName: 'aac'}]});
  }});
  await assert.rejects(
    () => collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'}),
    /requires a video stream/,
  );
  assert.equal(calls.log.length, 0);
});

test('ffprobe size mismatch fails before render-log read', async () => {
  const {collector, calls} = collectorFixture({inspectArtifact: async (input) => {
    calls.inspect.push(structuredClone(input));
    return inspectionFixture({
      format: {durationSeconds: 7, sizeBytes: ARTIFACT_BYTES.byteLength + 1, container: 'mp4'},
    });
  }});
  await assert.rejects(
    () => collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'}),
    /ffprobe size does not match collected artifact bytes/,
  );
  assert.equal(calls.log.length, 0);
});

test('canonical result validation rejects an inspected output profile that differs from the request', async () => {
  const {collector, calls} = collectorFixture({inspectArtifact: async (input) => {
    calls.inspect.push(structuredClone(input));
    return inspectionFixture({
      streams: [
        {index: 0, type: 'video', codecName: 'h264', width: 720, height: 1280, frameRate: 30},
        {index: 1, type: 'audio', codecName: 'aac'},
      ],
    });
  }});
  await assert.rejects(
    () => collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'}),
    /artifact output profile mismatch/,
  );
  assert.equal(calls.log.length, 1);
});

test('artifact-reader failure propagates without inspection or render-log reads', async () => {
  const {collector, calls} = collectorFixture({readArtifact: async () => {
    throw new Error('artifact unavailable');
  }});
  await assert.rejects(
    () => collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'}),
    /artifact unavailable/,
  );
  assert.equal(calls.inspect.length, 0);
  assert.equal(calls.log.length, 0);
});

test('inspection failure propagates without render-log read', async () => {
  const {collector, calls} = collectorFixture({inspectArtifact: async () => {
    throw new Error('ffprobe unavailable');
  }});
  await assert.rejects(
    () => collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'}),
    /ffprobe unavailable/,
  );
  assert.equal(calls.log.length, 0);
});

test('render-log failure propagates without fabricating a canonical succeeded result', async () => {
  const {collector} = collectorFixture({readRenderLog: async () => {
    throw new Error('render log unavailable');
  }});
  await assert.rejects(
    () => collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'}),
    /render log unavailable/,
  );
});

test('failed collection reads only render log and emits no artifact or ffprobe evidence', async () => {
  const request = requestFixture();
  const {collector, calls} = collectorFixture();
  const result = await collector.collectFailed({
    request,
    jobId: 'job-002',
    error: {code: 'RENDER_FAILED', stage: 'render', message: 'Renderer exited non-zero.', retryable: true},
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.artifact, undefined);
  assert.equal(result.evidence.artifactSha256, undefined);
  assert.equal(result.evidence.mediaInspection, undefined);
  assert.equal(result.evidence.renderLog.sha256, sha256EvidenceBytesV1(RENDER_LOG));
  assert.equal(result.evidence.inputManifestDigest, request.inputManifestDigest);
  assert.equal(calls.artifact.length, 0);
  assert.equal(calls.inspect.length, 0);
  assert.equal(calls.log.length, 1);
  assert.deepEqual(calls.authorize.map((call) => call.action), ['collect_failed_evidence']);
});

test('failed-result authorization denial occurs before render-log read', async () => {
  const {collector, calls} = collectorFixture({isJobAuthorized: async (input) => {
    calls.authorize.push(structuredClone(input));
    return false;
  }});
  await assert.rejects(
    () => collector.collectFailed({
      request: requestFixture(),
      jobId: 'job-002',
      error: {code: 'RENDER_FAILED', stage: 'render', message: 'Renderer exited.', retryable: false},
    }),
    /job is not authorized for collect_failed_evidence/,
  );
  assert.equal(calls.log.length, 0);
});

test('invalid failure stage is rejected before authorization and render-log I/O', async () => {
  const {collector, calls} = collectorFixture();
  await assert.rejects(
    () => collector.collectFailed({
      request: requestFixture(),
      jobId: 'job-002',
      error: {code: 'BAD', stage: 'publication', message: 'Out-of-contract stage.', retryable: false},
    }),
    /error.stage unsupported/,
  );
  assert.equal(calls.authorize.length, 0);
  assert.equal(calls.log.length, 0);
});

test('failure error cannot carry undeclared fields before authorization or I/O', async () => {
  const {collector, calls} = collectorFixture();
  await assert.rejects(
    () => collector.collectFailed({
      request: requestFixture(),
      jobId: 'job-002',
      error: {code: 'BAD', stage: 'render', message: 'bad', retryable: false, courseId: 'forbidden'},
    }),
    /courseId is not supported/,
  );
  assert.equal(calls.authorize.length, 0);
  assert.equal(calls.log.length, 0);
});

test('invalid collection timestamp prevents a canonical terminal result', async () => {
  const {collector} = collectorFixture({now: () => 'not-a-timestamp'});
  await assert.rejects(
    () => collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'}),
    /collectedAt must be an ISO-compatible timestamp/,
  );
});

test('collector outputs remain product-neutral and contain no consumer approval truth', async () => {
  const {collector} = collectorFixture();
  const success = await collector.collectSucceeded({request: requestFixture(), jobId: 'job-001'});
  const failure = await collector.collectFailed({
    request: requestFixture(),
    jobId: 'job-002',
    error: {code: 'RENDER_FAILED', stage: 'render', message: 'Renderer exited.', retryable: false},
  });
  const serialized = JSON.stringify({success, failure});
  for (const forbidden of [
    'courseId', 'studentId', 'teacherId', 'humanApproved', 'publicationAllowed',
    'publicationPerformed', 'socialPlatformBusinessFitApprovedByHuman', 'analyticsObserved',
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});