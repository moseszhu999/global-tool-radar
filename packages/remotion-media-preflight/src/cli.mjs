#!/usr/bin/env node
import {resolve} from 'node:path';
import {writePreflightReceipt} from './index.mjs';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
};

const verified = (name) => process.env[name]?.trim().toLowerCase() === 'true';

const output = resolve(process.env.REMOTION_PREFLIGHT_OUTPUT?.trim() || 'artifacts/remotion-media-preflight.json');

try {
  const receipt = await writePreflightReceipt({
    input: {
      designRecording: required('REMOTION_DESIGN_RECORDING'),
      buildLimitRecording: required('REMOTION_BUILD_LIMIT_RECORDING'),
      voiceover: required('REMOTION_VOICEOVER'),
      designRecordingVerified: verified('REMOTION_DESIGN_RECORDING_VERIFIED'),
      buildLimitRecordingVerified: verified('REMOTION_BUILD_LIMIT_RECORDING_VERIFIED'),
      voiceoverVerified: verified('REMOTION_VOICEOVER_VERIFIED'),
    },
    output,
  });

  process.stdout.write(`${JSON.stringify({
    output,
    receiptDigest: receipt.receiptDigest,
    truthBoundary: receipt.truthBoundary,
    finalRenderAllowed: receipt.finalRenderAllowed,
    blockedAssets: receipt.assets.filter((asset) => !asset.ready).map((asset) => ({role: asset.role, errors: asset.errors})),
  }, null, 2)}\n`);

  if (!receipt.finalRenderAllowed) process.exitCode = 2;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
