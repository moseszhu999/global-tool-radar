import assert from 'node:assert/strict';
import test from 'node:test';

import {createMediaRenderRequestV1} from '../../shared-media-render-contract/src/index.mjs';
import {materializeSharedMediaRemotionSmokeV1} from '../src/index.mjs';

const requestWithProfileId = (profileId) => createMediaRenderRequestV1({
  requestId: 'smoke-profile-security-001',
  purpose: 'infra.smoke',
  title: 'Blank profile identifier security smoke',
  language: 'en',
  shots: [{shotId: 'shot-01', order: 1, durationMs: 1000, narration: {mode: 'none'}, visualAssetIds: []}],
  visualAssets: [],
  voice: {mode: 'none'},
  captions: {mode: 'none', format: 'none'},
  outputProfile: {profileId, width: 320, height: 240, fps: 30, container: 'mp4'},
});

test('persisted output profile id must be a safe non-secret identifier', () => {
  assert.throws(
    () => materializeSharedMediaRemotionSmokeV1(requestWithProfileId('token:super-secret-value')),
    /profileId must be a safe non-secret identifier/,
  );
  assert.throws(
    () => materializeSharedMediaRemotionSmokeV1(requestWithProfileId('../escape')),
    /profileId must be a safe non-secret identifier/,
  );
});
