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

const requiredText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
};

export const buildMacRemotionRenderJob = ({gate, compositionId = 'ToolRadarReplitPortrait'} = {}) => {
  if (!gate || typeof gate !== 'object' || Array.isArray(gate)) throw new TypeError('gate must be an object');
  const errors = [];
  if (gate.version !== 1) errors.push('unsupported_gate_version');
  if (gate.finalRenderAllowed !== true) errors.push('render_gate_not_allowed');
  if (gate.truthBoundary !== 'render_execution_authorized') errors.push('render_gate_truth_boundary_invalid');
  if (!SHA256.test(gate.gateDigest ?? '')) errors.push('render_gate_digest_invalid');
  if (!Array.isArray(gate.assets) || gate.assets.length !== 3) errors.push('render_gate_assets_invalid');
  if (typeof gate.outputPath !== 'string' || gate.outputPath.trim() === '') errors.push('render_gate_output_missing');
  if (!gate.renderProfile || typeof gate.renderProfile !== 'object') errors.push('render_profile_missing');

  const finalRenderAllowed = errors.length === 0;
  const core = {
    schemaVersion: 'toolradar.mac-remotion-render-job.v1',
    finalRenderAllowed,
    truthBoundary: finalRenderAllowed ? 'verified_gate_bound_to_runner_job' : 'runner_job_blocked',
    gateDigest: gate.gateDigest ?? null,
    compositionId: requiredText(compositionId, 'compositionId'),
    outputPath: gate.outputPath ?? null,
    renderProfile: gate.renderProfile ?? null,
    assetDigests: Array.isArray(gate.assets)
      ? gate.assets.map(({role, actualSizeBytes, actualSha256}) => ({role, actualSizeBytes, actualSha256}))
      : [],
    errors,
  };
  const jobRequest = finalRenderAllowed
    ? {
        compositionId: core.compositionId,
        outputPath: core.outputPath,
        inputProps: {
          footageVerified: true,
          narrationVerified: true,
          finalRenderGateDigest: core.gateDigest,
        },
        renderProfile: core.renderProfile,
        evidence: {
          gateDigest: core.gateDigest,
          assetDigests: core.assetDigests,
        },
      }
    : null;

  return Object.freeze({...core, jobRequest, bindingDigest: digest({...core, jobRequest})});
};

export const validateMacRemotionRenderJobBinding = (binding) => {
  if (binding?.schemaVersion !== 'toolradar.mac-remotion-render-job.v1') throw new TypeError('unsupported binding schema');
  const {bindingDigest, ...core} = binding;
  if (!SHA256.test(bindingDigest ?? '')) throw new TypeError('bindingDigest must be SHA-256');
  if (digest(core) !== bindingDigest) throw new TypeError('binding digest mismatch');
  if (binding.finalRenderAllowed === true) {
    if (binding.truthBoundary !== 'verified_gate_bound_to_runner_job') throw new TypeError('allowed binding truth boundary invalid');
    if (!binding.jobRequest) throw new TypeError('allowed binding requires jobRequest');
    if (binding.jobRequest?.evidence?.gateDigest !== binding.gateDigest) throw new TypeError('jobRequest gate digest mismatch');
  } else if (binding.jobRequest !== null) {
    throw new TypeError('blocked binding must not contain jobRequest');
  }
  return true;
};
