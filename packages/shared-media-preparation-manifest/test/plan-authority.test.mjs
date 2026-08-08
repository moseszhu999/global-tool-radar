import assert from 'node:assert/strict';
import test from 'node:test';

import {createMediaRenderRequestV1} from '../../shared-media-render-contract/src/index.mjs';
import {compileCanonicalRenderPlanV1} from '../../shared-media-canonical-render-plan/src/index.mjs';
import {
  compilePreparationManifestV1,
  computePreparationManifestDigestV1,
  validatePreparationManifestV1,
} from '../src/index.mjs';

const sha = (c) => c.repeat(64);

const request = createMediaRenderRequestV1({
  requestId:'preparation-plan-authority-001',
  purpose:'infra.smoke',
  title:'Preparation source authority proof',
  language:'en',
  shots:[{shotId:'shot-1',order:1,durationMs:1000,narration:{mode:'text',text:'Source authority.'},visualAssetIds:['asset-1']}],
  visualAssets:[{assetId:'asset-1',kind:'image',locator:'media://inputs/original.png',mediaType:'image/png',sha256:sha('a')}],
  voice:{mode:'none'},
  captions:{mode:'none',format:'none'},
  outputProfile:{profileId:'authority-proof',width:640,height:480,fps:30,container:'mp4'},
});

const plan = compileCanonicalRenderPlanV1(request);

test('re-signed source substitution can be internally self-consistent but exact render plan still rejects it', () => {
  const manifest=structuredClone(compilePreparationManifestV1(plan));
  manifest.visualInputs[0].locator='media://inputs/substituted.png';
  manifest.visualInputs[0].expectedSha256=sha('b');
  manifest.preparationManifestDigest=computePreparationManifestDigestV1(manifest);

  assert.equal(validatePreparationManifestV1(manifest),true);
  assert.throws(
    ()=>validatePreparationManifestV1(manifest,{plan}),
    /does not match exact render plan/,
  );
});
