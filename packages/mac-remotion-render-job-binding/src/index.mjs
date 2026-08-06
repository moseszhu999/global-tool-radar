import {createHash} from 'node:crypto';

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const digest = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');
const SHA256 = /^[a-f0-9]{64}$/;
const SECRET_KEY = /(authorization|token|secret|password|cookie|api[-_]?key)/i;

const requiredText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
};

const hasSecretField = (value) => {
  if (Array.isArray(value)) return value.some(hasSecretField);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => SECRET_KEY.test(key) || hasSecretField(item));
};

const normalizeAssets = (assets, errors) => {
  if (!Array.isArray(assets) || assets.length !== 3) {
    errors.push('render_gate_assets_invalid');
    return [];
  }
  const roles = new Set();
  return assets.map((asset, index) => {
    const role = typeof asset?.role === 'string' ? asset.role.trim() : '';
    if (!role) errors.push(`asset_${index}_role_invalid`);
    else if (roles.has(role)) errors.push(`asset_${index}_role_duplicate`);
    roles.add(role);
    if (!Number.isInteger(asset?.actualSizeBytes) || asset.actualSizeBytes <= 0) {
      errors.push(`asset_${index}_size_invalid`);
    }
    if (!SHA256.test(asset?.actualSha256 ?? '')) errors.push(`asset_${index}_digest_invalid`);
    return {
      role: role || null,
      actualSizeBytes: asset?.actualSizeBytes ?? null,
      actualSha256: asset?.actualSha256 ?? null,
    };
  });
};

const validRenderProfile = (profile) => profile
  && typeof profile === 'object'
  && !Array.isArray(profile)
  && Number.isFinite(profile.width) && profile.width > 0
  && Number.isFinite(profile.height) && profile.height > 0
  && Number.isFinite(profile.durationSeconds) && profile.durationSeconds > 0
  && Number.isFinite(profile.fps) && profile.fps > 0;

export const buildMacRemotionRenderIntent = ({gate, compositionId = 'ToolRadarReplitPortrait'} = {}) => {
  if (!gate || typeof gate !== 'object' || Array.isArray(gate)) throw new TypeError('gate must be an object');
  const errors = [];
  if (gate.version !== 1) errors.push('unsupported_gate_version');
  if (gate.finalRenderAllowed !== true) errors.push('render_gate_not_allowed');
  if (gate.truthBoundary !== 'render_execution_authorized') errors.push('render_gate_truth_boundary_invalid');
  if (!SHA256.test(gate.gateDigest ?? '')) errors.push('render_gate_digest_invalid');
  const assetDigests = normalizeAssets(gate.assets, errors);
  if (typeof gate.outputPath !== 'string' || gate.outputPath.trim() === '') errors.push('render_gate_output_missing');
  if (!validRenderProfile(gate.renderProfile)) errors.push('render_profile_invalid');

  const finalRenderAllowed = errors.length === 0;
  const renderIntent = finalRenderAllowed
    ? {
        compositionId: requiredText(compositionId, 'compositionId'),
        outputPath: gate.outputPath.trim(),
        renderProfile: gate.renderProfile,
        evidence: {
          gateDigest: gate.gateDigest,
          assetDigests,
        },
      }
    : null;
  const core = {
    schemaVersion: 'toolradar.mac-remotion-render-intent.v1',
    finalRenderAllowed,
    truthBoundary: finalRenderAllowed ? 'verified_gate_bound_to_render_intent' : 'render_intent_blocked',
    gateDigest: gate.gateDigest ?? null,
    renderIntent,
    errors,
  };
  return Object.freeze({...core, bindingDigest: digest(core)});
};

export const validateMacRemotionRenderIntent = (binding) => {
  if (binding?.schemaVersion !== 'toolradar.mac-remotion-render-intent.v1') throw new TypeError('unsupported binding schema');
  const {bindingDigest, ...core} = binding;
  if (!SHA256.test(bindingDigest ?? '')) throw new TypeError('bindingDigest must be SHA-256');
  if (digest(core) !== bindingDigest) throw new TypeError('binding digest mismatch');
  if (binding.finalRenderAllowed === true) {
    if (binding.truthBoundary !== 'verified_gate_bound_to_render_intent') throw new TypeError('allowed binding truth boundary invalid');
    if (!binding.renderIntent) throw new TypeError('allowed binding requires renderIntent');
    if (binding.renderIntent?.evidence?.gateDigest !== binding.gateDigest) throw new TypeError('renderIntent gate digest mismatch');
  } else if (binding.renderIntent !== null) {
    throw new TypeError('blocked binding must not contain renderIntent');
  }
  return true;
};

export const materializeMacRemotionRunnerRequest = ({binding, mapRequest} = {}) => {
  validateMacRemotionRenderIntent(binding);
  if (binding.finalRenderAllowed !== true) throw new Error('render intent is not authorized');
  if (typeof mapRequest !== 'function') throw new TypeError('mapRequest must be a function');
  const requestBody = mapRequest(structuredClone(binding.renderIntent));
  if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
    throw new TypeError('mapRequest must return a request object');
  }
  if (hasSecretField(requestBody)) throw new Error('runner request must not contain secret fields');
  const core = {
    schemaVersion: 'toolradar.mac-remotion-runner-request.v1',
    bindingDigest: binding.bindingDigest,
    truthBoundary: 'runner_request_materialized_by_explicit_adapter',
    requestBody,
    requestDigest: digest(requestBody),
  };
  return Object.freeze({...core, envelopeDigest: digest(core)});
};

export const validateMacRemotionRunnerRequest = (envelope) => {
  if (envelope?.schemaVersion !== 'toolradar.mac-remotion-runner-request.v1') throw new TypeError('unsupported request schema');
  const {envelopeDigest, ...core} = envelope;
  if (!SHA256.test(envelopeDigest ?? '') || digest(core) !== envelopeDigest) throw new TypeError('request envelope digest mismatch');
  if (!SHA256.test(envelope.bindingDigest ?? '')) throw new TypeError('binding digest invalid');
  if (!SHA256.test(envelope.requestDigest ?? '') || digest(envelope.requestBody) !== envelope.requestDigest) {
    throw new TypeError('request body digest mismatch');
  }
  if (hasSecretField(envelope.requestBody)) throw new Error('runner request contains secret fields');
  return true;
};
