import {createHash} from 'node:crypto';
import {readFile, stat} from 'node:fs/promises';
import {resolve} from 'node:path';

const sha256 = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');

export const buildFinalRenderGate = async ({receiptPath, appDir = 'apps/remotion-video', outputPath = 'out/toolradar-replit-final.mp4'}) => {
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
          actualSha256 = await sha256(path);
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
  const command = `npm --prefix ${appDir} run render:final -- --output=${outputPath}`;
  const canonical = JSON.stringify({version: 1, receiptDigest: receipt?.receiptDigest ?? null, assets: assets.map(({role, actualSizeBytes, actualSha256}) => ({role, actualSizeBytes, actualSha256})), finalRenderAllowed, command});

  return {
    version: 1,
    receiptPath,
    receiptDigest: receipt?.receiptDigest ?? null,
    finalRenderAllowed,
    truthBoundary: finalRenderAllowed ? 'render_execution_authorized' : 'render_execution_blocked',
    command: finalRenderAllowed ? command : null,
    assets,
    errors,
    gateDigest: createHash('sha256').update(canonical).digest('hex'),
  };
};
