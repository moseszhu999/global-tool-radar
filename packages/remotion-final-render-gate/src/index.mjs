import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import {resolve} from 'node:path';

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

const requiredText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
};

const normalizeCodecs = (value, fallback, field) => {
  const codecs = value ?? fallback;
  if (!Array.isArray(codecs) || codecs.length === 0) throw new TypeError(`${field} must be a non-empty array`);
  return [...new Set(codecs.map((codec) => requiredText(codec, `${field}[]`).toLowerCase()))].sort();
};

export const normalizeFinalRenderProfile = (profile = {}) => {
  const normalized = {
    width: Number(profile.width ?? 1080),
    height: Number(profile.height ?? 1920),
    durationSeconds: Number(profile.durationSeconds ?? 89),
    durationToleranceSeconds: Number(profile.durationToleranceSeconds ?? 0.5),
    fps: Number(profile.fps ?? 30),
    fpsTolerance: Number(profile.fpsTolerance ?? 0.01),
    allowedVideoCodecs: normalizeCodecs(profile.allowedVideoCodecs, ['h264'], 'renderProfile.allowedVideoCodecs'),
    allowedAudioCodecs: normalizeCodecs(profile.allowedAudioCodecs, ['aac'], 'renderProfile.allowedAudioCodecs'),
  };

  for (const field of ['width', 'height', 'durationSeconds', 'fps']) {
    if (!Number.isFinite(normalized[field]) || normalized[field] <= 0) throw new TypeError(`renderProfile.${field} must be positive`);
  }
  for (const field of ['durationToleranceSeconds', 'fpsTolerance']) {
    if (!Number.isFinite(normalized[field]) || normalized[field] < 0) throw new TypeError(`renderProfile.${field} must be non-negative`);
  }
  return Object.freeze(normalized);
};

export const buildFinalRenderGateCanonical = (gate) => ({
  version: 1,
  receiptDigest: gate?.receiptDigest ?? null,
  assets: Array.isArray(gate?.assets)
    ? gate.assets.map(({role, actualSizeBytes, actualSha256}) => ({role, actualSizeBytes, actualSha256}))
    : [],
  finalRenderAllowed: gate?.finalRenderAllowed === true,
  command: gate?.command ?? null,
  outputPath: gate?.outputPath ?? null,
  renderProfile: normalizeFinalRenderProfile(gate?.renderProfile),
});

export const computeFinalRenderGateDigest = (gate) => digest(stableStringify(buildFinalRenderGateCanonical(gate)));

export const validateFinalRenderGateReceipt = (gate) => {
  const errors = [];
  if (gate?.version !== 1) errors.push('unsupported_gate_receipt_version');
  if (gate?.finalRenderAllowed !== true) errors.push('render_gate_not_allowed');
  if (gate?.truthBoundary !== 'render_execution_authorized') errors.push('render_gate_truth_boundary_invalid');
  if (typeof gate?.outputPath !== 'string' || gate.outputPath.trim() === '') errors.push('render_gate_output_path_missing');
  if (!Array.isArray(gate?.assets) || gate.assets.length !== 3) errors.push('render_gate_asset_set_invalid');
  if (typeof gate?.gateDigest !== 'string' || !/^[a-f0-9]{64}$/.test(gate.gateDigest)) {
    errors.push('render_gate_digest_invalid');
  } else {
    try {
      if (computeFinalRenderGateDigest(gate) !== gate.gateDigest) errors.push('render_gate_digest_mismatch');
    } catch {
      errors.push('render_gate_profile_invalid');
    }
  }
  return Object.freeze(errors);
};

export const buildFinalRenderGate = async ({
  receiptPath,
  appDir = 'apps/remotion-video',
  outputPath = 'out/toolradar-replit-final.mp4',
  renderProfile,
}) => {
  const normalizedAppDir = requiredText(appDir, 'appDir');
  const normalizedOutputPath = requiredText(outputPath, 'outputPath');
  const normalizedRenderProfile = normalizeFinalRenderProfile(renderProfile);
  const absoluteReceipt = resolve(receiptPath);
  const receipt = JSON.parse(await readFile(absoluteReceipt, 'utf8'));
  const errors = [];

  if (receipt?.version !== 1) errors.push('unsupported_receipt_version');
  if (receipt?.finalRenderAllowed !== true) errors.push('preflight_not_allowed');
  if (receipt?.truthBoundary !== 'owned_media_verified') errors.push('truth_boundary_not_verified');
  if (!Array.isArray(receipt?.assets) || receipt.assets.length !== 3) errors.push('invalid_asset_set');

  const assets = [];
  if (Array.isArray(receipt?.assets)) {
    for (const asset of receipt.assets) {
      const path = resolve(asset.path || '');
      let actualSizeBytes = null;
      let actualSha256 = null;
      const assetErrors = [];
      try {
        const info = await stat(path);
        if (!info.isFile()) assetErrors.push('not_a_file');
        else {
          actualSizeBytes = info.size;
          actualSha256 = await sha256File(path);
          if (asset.ready !== true) assetErrors.push('asset_not_ready');
          if (asset.verified !== true) assetErrors.push('asset_not_verified');
          if (asset.sizeBytes !== actualSizeBytes) assetErrors.push('size_changed_after_preflight');
          if (asset.sha256 !== actualSha256) assetErrors.push('digest_changed_after_preflight');
        }
      } catch (error) {
        if (error?.code === 'ENOENT') assetErrors.push('file_missing_after_preflight');
        else throw error;
      }
      assets.push({role: asset.role, path: asset.path, actualSizeBytes, actualSha256, errors: assetErrors});
      errors.push(...assetErrors.map((error) => `${asset.role || 'unknown'}:${error}`));
    }
  }

  const finalRenderAllowed = errors.length === 0;
  const command = finalRenderAllowed
    ? `npm --prefix ${normalizedAppDir} run render:final -- --output=${normalizedOutputPath}`
    : null;
  const gate = {
    version: 1,
    receiptPath,
    receiptDigest: receipt?.receiptDigest ?? null,
    finalRenderAllowed,
    truthBoundary: finalRenderAllowed ? 'render_execution_authorized' : 'render_execution_blocked',
    command,
    outputPath: normalizedOutputPath,
    renderProfile: normalizedRenderProfile,
    assets,
    errors,
  };

  return Object.freeze({...gate, gateDigest: computeFinalRenderGateDigest(gate)});
};
