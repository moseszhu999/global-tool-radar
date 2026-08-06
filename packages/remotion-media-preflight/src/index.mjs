import {createHash} from 'node:crypto';
import {stat, readFile, mkdir, writeFile} from 'node:fs/promises';
import {extname, resolve} from 'node:path';

const ALLOWED_VIDEO = new Set(['.mp4', '.mov', '.webm']);
const ALLOWED_AUDIO = new Set(['.wav', '.mp3', '.m4a', '.aac']);

const sha256 = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');

const inspect = async ({role, path, verified, allowedExtensions}) => {
  const absolutePath = resolve(path);
  const extension = extname(path).toLowerCase();
  const errors = [];
  if (!allowedExtensions.has(extension)) errors.push(`unsupported_extension:${extension || 'none'}`);
  if (verified !== true) errors.push('human_verification_missing');

  let sizeBytes = null;
  let digest = null;
  try {
    const info = await stat(absolutePath);
    if (!info.isFile()) errors.push('not_a_file');
    else {
      sizeBytes = info.size;
      if (sizeBytes === 0) errors.push('empty_file');
      digest = await sha256(absolutePath);
    }
  } catch (error) {
    if (error?.code === 'ENOENT') errors.push('file_missing');
    else throw error;
  }

  return {
    role,
    path,
    extension,
    verified: verified === true,
    sizeBytes,
    sha256: digest,
    ready: errors.length === 0,
    errors,
  };
};

export const buildRemotionMediaPreflight = async (input) => {
  const assets = await Promise.all([
    inspect({role: 'design_recording', path: input.designRecording, verified: input.designRecordingVerified, allowedExtensions: ALLOWED_VIDEO}),
    inspect({role: 'build_limit_recording', path: input.buildLimitRecording, verified: input.buildLimitRecordingVerified, allowedExtensions: ALLOWED_VIDEO}),
    inspect({role: 'voiceover', path: input.voiceover, verified: input.voiceoverVerified, allowedExtensions: ALLOWED_AUDIO}),
  ]);
  const readyForFinalRender = assets.every((asset) => asset.ready);
  const canonical = JSON.stringify({version: 1, assets: assets.map(({role, path, sizeBytes, sha256, ready}) => ({role, path, sizeBytes, sha256, ready}))});
  return {
    version: 1,
    readyForFinalRender,
    truthBoundary: readyForFinalRender ? 'owned_media_verified' : 'preview_only',
    finalRenderAllowed: readyForFinalRender,
    assets,
    receiptDigest: createHash('sha256').update(canonical).digest('hex'),
  };
};

export const writePreflightReceipt = async ({input, output}) => {
  const receipt = await buildRemotionMediaPreflight(input);
  await mkdir(resolve(output, '..'), {recursive: true});
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  return receipt;
};
