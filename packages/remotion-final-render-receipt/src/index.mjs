import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {normalizeFinalRenderProfile, validateFinalRenderGateReceipt} from '../../remotion-final-render-gate/src/index.mjs';

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const digest = (value) => createHash('sha256').update(value).digest('hex');

const sha256File = (path) => new Promise((resolveDigest, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(path);
  stream.on('error', reject);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('end', () => resolveDigest(hash.digest('hex')));
});

const normalizeProbe = (probe) => ({
  width: Number(probe?.width),
  height: Number(probe?.height),
  durationSeconds: Number(probe?.durationSeconds),
  fps: Number(probe?.fps),
  codec: String(probe?.codec ?? '').toLowerCase(),
  audioCodec: String(probe?.audioCodec ?? '').toLowerCase(),
});

export const buildFinalRenderReceipt = async ({gateReceiptPath, videoPath, probeVideo}) => {
  if (typeof probeVideo !== 'function') throw new TypeError('probeVideo must be a function');
  const gateReceipt = JSON.parse(await readFile(resolve(gateReceiptPath), 'utf8'));
  const errors = [...validateFinalRenderGateReceipt(gateReceipt)];
  const renderProfile = normalizeFinalRenderProfile(gateReceipt?.renderProfile);
  const expectedVideoPath = typeof gateReceipt?.outputPath === 'string' ? resolve(gateReceipt.outputPath) : null;
  const absoluteVideoPath = resolve(videoPath);

  if (expectedVideoPath && absoluteVideoPath !== expectedVideoPath) errors.push('video_path_not_bound_to_gate');

  let sizeBytes = null;
  let videoSha256 = null;
  let probe = null;

  try {
    const info = await stat(absoluteVideoPath);
    if (!info.isFile()) errors.push('video_not_a_file');
    else if (info.size === 0) errors.push('video_empty');
    else {
      sizeBytes = info.size;
      videoSha256 = await sha256File(absoluteVideoPath);
      probe = normalizeProbe(await probeVideo(absoluteVideoPath));
      if (probe.width !== renderProfile.width || probe.height !== renderProfile.height) errors.push('unexpected_dimensions');
      if (!Number.isFinite(probe.durationSeconds) || Math.abs(probe.durationSeconds - renderProfile.durationSeconds) > renderProfile.durationToleranceSeconds) errors.push('unexpected_duration');
      if (!Number.isFinite(probe.fps) || Math.abs(probe.fps - renderProfile.fps) > renderProfile.fpsTolerance) errors.push('unexpected_fps');
      if (!renderProfile.allowedVideoCodecs.includes(probe.codec)) errors.push('unexpected_video_codec');
      if (!renderProfile.allowedAudioCodecs.includes(probe.audioCodec)) errors.push('unexpected_audio_codec');
    }
  } catch (error) {
    if (error?.code === 'ENOENT') errors.push('video_missing');
    else throw error;
  }

  const finalVideoVerified = errors.length === 0;
  const canonical = {
    version: 1,
    gateDigest: gateReceipt?.gateDigest ?? null,
    videoPath: gateReceipt?.outputPath ?? videoPath,
    sizeBytes,
    videoSha256,
    probe,
    renderProfile,
    finalVideoVerified,
  };

  return Object.freeze({
    ...canonical,
    gateReceiptPath,
    gateDigestVerified: !errors.includes('render_gate_digest_invalid') && !errors.includes('render_gate_digest_mismatch'),
    truthBoundary: finalVideoVerified ? 'final_video_file_verified' : 'final_video_verification_blocked',
    errors: Object.freeze(errors),
    receiptDigest: digest(stableStringify(canonical)),
  });
};
