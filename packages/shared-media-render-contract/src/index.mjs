import {createHash} from 'node:crypto';

export const MEDIA_RENDER_V1 = 'media.render.v1';
export const MEDIA_RENDER_INPUT_MANIFEST_V1 = 'media.render.input-manifest.v1';
export const MEDIA_RENDER_STATUSES = Object.freeze(['queued', 'running', 'succeeded', 'failed', 'cancelled']);
export const MEDIA_RENDER_ERROR_STAGES = Object.freeze(['validation', 'voice', 'captions', 'timeline', 'render', 'inspect', 'artifact', 'unknown']);

const STATUS = new Set(MEDIA_RENDER_STATUSES);
const STAGES = new Set(MEDIA_RENDER_ERROR_STAGES);
const SHA = /^[a-f0-9]{64}$/;
const PURPOSE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const FORBIDDEN = new Set([
  'socialaccount','socialplatformaccount','platformaccount','publicationaccount','publishingaccount','channelaccount','channelcredentials','publishingcredentials','publicationcredentials',
  'trainingos','trainingosobject','courseid','unitid','lessonid','classid','studentid','teacherid',
  'views','viewcount','likes','likecount','comments','commentcount','followers','followercount','watchtime','completionrate','ctr','growthmetrics','analytics','performance',
  'humanapproved','humanreviewed','approvedbyhuman','reviewedbyhuman','publicationallowed','publicationperformed','published','publishedat','publisheddestination',
]);

export class MediaRenderContractError extends TypeError {
  constructor(code, message, {path = null} = {}) { super(message); this.name = 'MediaRenderContractError'; this.code = code; this.path = path; }
}
const fail = (code, message, path = null) => { throw new MediaRenderContractError(code, message, {path}); };
const obj = (v, p) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail('INVALID_FIELD', `${p} must be an object`, p); return v; };
const text = (v, p) => { if (typeof v !== 'string' || !v.trim()) fail('INVALID_FIELD', `${p} must be non-empty`, p); return v.trim(); };
const sha = (v, p) => { const s = text(v, p).toLowerCase(); if (!SHA.test(s)) fail('INVALID_FIELD', `${p} must be lowercase SHA-256 hex`, p); return s; };
const integer = (v, p, min = 0) => { if (!Number.isInteger(v) || v < min) fail('INVALID_FIELD', `${p} must be integer >= ${min}`, p); return v; };
const positive = (v, p) => { if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) fail('INVALID_FIELD', `${p} must be > 0`, p); return v; };
const array = (v, p, empty = false) => { if (!Array.isArray(v) || (!empty && v.length === 0)) fail('INVALID_FIELD', `${p} must be ${empty ? 'an' : 'a non-empty'} array`, p); return v; };
const timestamp = (v, p) => { const s = text(v, p); if (Number.isNaN(Date.parse(s))) fail('INVALID_FIELD', `${p} must be timestamp`, p); return s; };
const keyId = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');

export const assertNoForbiddenDomainFieldsV1 = (value, path = '$') => {
  if (Array.isArray(value)) { value.forEach((v, i) => assertNoForbiddenDomainFieldsV1(v, `${path}[${i}]`)); return true; }
  if (!value || typeof value !== 'object') return true;
  for (const [k, v] of Object.entries(value)) { const p = `${path}.${k}`; if (FORBIDDEN.has(keyId(k))) fail('FORBIDDEN_DOMAIN_FIELD', `${p} is outside media.render.v1`, p); assertNoForbiddenDomainFieldsV1(v, p); }
  return true;
};

export const stableStringifyV1 = (v) => Array.isArray(v)
  ? `[${v.map(stableStringifyV1).join(',')}]`
  : v && typeof v === 'object'
    ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableStringifyV1(v[k])}`).join(',')}}`
    : JSON.stringify(v);
export const sha256CanonicalJsonV1 = (v) => createHash('sha256').update(stableStringifyV1(v)).digest('hex');

export const buildMediaRenderInputManifestV1 = (r) => ({
  schemaVersion: MEDIA_RENDER_INPUT_MANIFEST_V1,
  purpose: r.purpose, title: r.title ?? null, language: r.language, shots: r.shots,
  visualAssets: r.visualAssets, voice: r.voice, captions: r.captions, outputProfile: r.outputProfile,
});
export const computeMediaRenderInputManifestDigestV1 = (r) => sha256CanonicalJsonV1(buildMediaRenderInputManifestV1(r));

const validateAsset = (a, p, visual = false) => {
  obj(a, p); text(a.assetId, `${p}.assetId`); text(a.locator, `${p}.locator`); sha(a.sha256, `${p}.sha256`);
  if (visual && !['image','video','code','slide','screen','graphic','other'].includes(a.kind)) fail('INVALID_FIELD', `${p}.kind unsupported`, `${p}.kind`);
  if (!visual) text(a.mediaType, `${p}.mediaType`);
};
const validateVoice = (v, p) => {
  obj(v, p); if (!['synthesize','provided','none'].includes(v.mode)) fail('INVALID_FIELD', `${p}.mode unsupported`, `${p}.mode`);
  if (v.mode === 'synthesize') { text(v.provider, `${p}.provider`); text(v.voiceId, `${p}.voiceId`); if (v.rate !== undefined && (typeof v.rate !== 'number' || v.rate < .5 || v.rate > 2)) fail('INVALID_FIELD', `${p}.rate invalid`, `${p}.rate`); if (v.audioAsset !== undefined) fail('INVALID_FIELD', `${p}.audioAsset only for provided`, `${p}.audioAsset`); }
  if (v.mode === 'provided') validateAsset(v.audioAsset, `${p}.audioAsset`);
  if (v.mode === 'none' && (v.provider !== undefined || v.voiceId !== undefined || v.audioAsset !== undefined)) fail('INVALID_FIELD', `${p} none mode has extra voice data`, p);
};
const validateCaptions = (c, p) => {
  obj(c, p); if (!['auto','provided','none'].includes(c.mode)) fail('INVALID_FIELD', `${p}.mode unsupported`, `${p}.mode`);
  if (!['burn-in','srt','vtt','none'].includes(c.format)) fail('INVALID_FIELD', `${p}.format unsupported`, `${p}.format`);
  if (c.mode === 'provided') validateAsset(c.captionAsset, `${p}.captionAsset`);
  if (c.mode === 'none' && c.format !== 'none') fail('INVALID_FIELD', `${p}.format must be none`, `${p}.format`);
  if (c.mode !== 'provided' && c.captionAsset !== undefined) fail('INVALID_FIELD', `${p}.captionAsset requires provided mode`, `${p}.captionAsset`);
};
const validateProfile = (o, p) => { obj(o,p); text(o.profileId,`${p}.profileId`); integer(o.width,`${p}.width`,1); integer(o.height,`${p}.height`,1); positive(o.fps,`${p}.fps`); text(o.container,`${p}.container`); };

export const validateMediaRenderRequestV1 = (r, {verifyDigest = true} = {}) => {
  obj(r,'$'); assertNoForbiddenDomainFieldsV1(r);
  if (r.contractVersion !== MEDIA_RENDER_V1 || r.messageType !== 'request') fail('INVALID_ENVELOPE','media.render.v1 request required','$');
  text(r.requestId,'$.requestId'); if (!PURPOSE.test(text(r.purpose,'$.purpose'))) fail('INVALID_FIELD','$.purpose must be stable lowercase token','$.purpose'); text(r.language,'$.language');
  const assets = array(r.visualAssets,'$.visualAssets',true), ids = new Set();
  assets.forEach((a,i)=>{ validateAsset(a,`$.visualAssets[${i}]`,true); if(ids.has(a.assetId)) fail('INVALID_FIELD','duplicate assetId',`$.visualAssets[${i}].assetId`); ids.add(a.assetId); });
  const shotIds = new Set(); array(r.shots,'$.shots').forEach((s,i)=>{ const p=`$.shots[${i}]`; obj(s,p); text(s.shotId,`${p}.shotId`); if(shotIds.has(s.shotId)) fail('INVALID_FIELD','duplicate shotId',`${p}.shotId`); shotIds.add(s.shotId); if(s.order!==i+1) fail('INVALID_FIELD',`${p}.order must equal ${i+1}`,`${p}.order`); if(s.durationMs!==undefined) integer(s.durationMs,`${p}.durationMs`,1); obj(s.narration,`${p}.narration`); if(!['text','none'].includes(s.narration.mode)) fail('INVALID_FIELD',`${p}.narration.mode unsupported`,`${p}.narration.mode`); if(s.narration.mode==='text') text(s.narration.text,`${p}.narration.text`); if(s.narration.mode==='none'&&s.narration.text!==undefined) fail('INVALID_FIELD','none narration cannot carry text',`${p}.narration.text`); array(s.visualAssetIds??[],`${p}.visualAssetIds`,true).forEach((id,j)=>{ text(id,`${p}.visualAssetIds[${j}]`); if(!ids.has(id)) fail('INVALID_FIELD',`unknown visual asset ${id}`,`${p}.visualAssetIds[${j}]`); }); });
  validateVoice(r.voice,'$.voice'); validateCaptions(r.captions,'$.captions'); validateProfile(r.outputProfile,'$.outputProfile');
  obj(r.evidenceRequirements,'$.evidenceRequirements'); for(const k of ['requireMediaInspection','requireSha256','requireRenderLog','requireInputManifestDigest']) if(r.evidenceRequirements[k]!==true) fail('INVALID_FIELD',`$.evidenceRequirements.${k} must be true`,`$.evidenceRequirements.${k}`);
  const d=sha(r.inputManifestDigest,'$.inputManifestDigest'); if(verifyDigest && d!==computeMediaRenderInputManifestDigestV1(r)) fail('MANIFEST_DIGEST_MISMATCH','inputManifestDigest mismatch','$.inputManifestDigest'); return true;
};

export const createMediaRenderRequestV1 = (input) => {
  const r=structuredClone(obj(input,'$')); r.contractVersion=MEDIA_RENDER_V1; r.messageType='request'; r.evidenceRequirements={requireMediaInspection:true,requireSha256:true,requireRenderLog:true,requireInputManifestDigest:true}; r.inputManifestDigest=computeMediaRenderInputManifestDigestV1(r); validateMediaRenderRequestV1(r); return Object.freeze(r);
};

const validateInspection = (m,p) => {
  obj(m,p); if(m.tool!=='ffprobe'||m.status!=='passed') fail('INVALID_FIELD',`${p} must be passed ffprobe evidence`,p); timestamp(m.inspectedAt,`${p}.inspectedAt`); obj(m.format,`${p}.format`); positive(m.format.durationSeconds,`${p}.format.durationSeconds`); integer(m.format.sizeBytes,`${p}.format.sizeBytes`,1);
  array(m.streams,`${p}.streams`).forEach((s,i)=>{ const q=`${p}.streams[${i}]`; obj(s,q); integer(s.index,`${q}.index`); if(!['video','audio','subtitle','data','attachment','unknown'].includes(s.type)) fail('INVALID_FIELD',`${q}.type unsupported`,`${q}.type`); text(s.codecName,`${q}.codecName`); if(s.width!==undefined) integer(s.width,`${q}.width`,1); if(s.height!==undefined) integer(s.height,`${q}.height`,1); if(s.frameRate!==undefined) positive(s.frameRate,`${q}.frameRate`); });
};
export const validateMediaRenderEvidenceV1 = (e) => {
  obj(e,'$'); assertNoForbiddenDomainFieldsV1(e); if(e.contractVersion!==MEDIA_RENDER_V1||e.messageType!=='evidence') fail('INVALID_ENVELOPE','media.render.v1 evidence required','$'); text(e.requestId,'$.requestId'); text(e.jobId,'$.jobId'); sha(e.inputManifestDigest,'$.inputManifestDigest');
  const hasSha=e.artifactSha256!=null, hasProbe=e.mediaInspection!=null; if(hasSha) sha(e.artifactSha256,'$.artifactSha256'); if(hasProbe) validateInspection(e.mediaInspection,'$.mediaInspection'); if(hasSha!==hasProbe) fail('EVIDENCE_MISMATCH','artifactSha256 and mediaInspection must be paired','$');
  obj(e.renderLog,'$.renderLog'); sha(e.renderLog.sha256,'$.renderLog.sha256'); if(e.renderLog.byteLength!==undefined) integer(e.renderLog.byteLength,'$.renderLog.byteLength',1); timestamp(e.collectedAt,'$.collectedAt'); return true;
};
const validateArtifact = (a,p) => { obj(a,p); text(a.artifactId,`${p}.artifactId`); text(a.locator,`${p}.locator`); text(a.mediaType,`${p}.mediaType`); integer(a.byteLength,`${p}.byteLength`,1); sha(a.sha256,`${p}.sha256`); positive(a.durationSeconds,`${p}.durationSeconds`); integer(a.width,`${p}.width`,1); integer(a.height,`${p}.height`,1); text(a.container,`${p}.container`); text(a.videoCodec,`${p}.videoCodec`); };
const validateError = (e,p) => { obj(e,p); text(e.code,`${p}.code`); if(!STAGES.has(e.stage)) fail('INVALID_FIELD',`${p}.stage unsupported`,`${p}.stage`); text(e.message,`${p}.message`); if(typeof e.retryable!=='boolean') fail('INVALID_FIELD',`${p}.retryable must be boolean`,`${p}.retryable`); };

export const validateMediaRenderResultV1 = (r,{request=null}={}) => {
  obj(r,'$'); assertNoForbiddenDomainFieldsV1(r); if(r.contractVersion!==MEDIA_RENDER_V1||r.messageType!=='result') fail('INVALID_ENVELOPE','media.render.v1 result required','$'); text(r.requestId,'$.requestId'); text(r.jobId,'$.jobId'); if(!STATUS.has(r.status)) fail('INVALID_FIELD','$.status unsupported','$.status');
  if(r.status==='succeeded') { if(r.error!=null) fail('RESULT_TRUTH_BOUNDARY','succeeded cannot contain error','$.error'); validateArtifact(r.artifact,'$.artifact'); validateMediaRenderEvidenceV1(r.evidence); if(!r.evidence.artifactSha256||!r.evidence.mediaInspection) fail('RESULT_TRUTH_BOUNDARY','succeeded requires artifact inspection evidence','$.evidence'); if(r.evidence.requestId!==r.requestId||r.evidence.jobId!==r.jobId) fail('EVIDENCE_MISMATCH','evidence identity mismatch','$.evidence'); if(r.evidence.artifactSha256!==r.artifact.sha256) fail('EVIDENCE_MISMATCH','artifact SHA mismatch','$.evidence.artifactSha256'); const m=r.evidence.mediaInspection; if(m.format.sizeBytes!==r.artifact.byteLength||Math.abs(m.format.durationSeconds-r.artifact.durationSeconds)>.01) fail('EVIDENCE_MISMATCH','ffprobe format mismatch','$.evidence.mediaInspection.format'); const v=m.streams.find(x=>x.type==='video'); if(!v||v.width!==r.artifact.width||v.height!==r.artifact.height||v.codecName!==r.artifact.videoCodec) fail('EVIDENCE_MISMATCH','ffprobe video stream mismatch','$.evidence.mediaInspection.streams'); if(r.artifact.audioCodec){const a=m.streams.find(x=>x.type==='audio'); if(!a||a.codecName!==r.artifact.audioCodec) fail('EVIDENCE_MISMATCH','ffprobe audio stream mismatch','$.evidence.mediaInspection.streams');} }
  else if(r.status==='failed') { if(r.artifact!=null) fail('RESULT_TRUTH_BOUNDARY','failed cannot claim final artifact','$.artifact'); validateMediaRenderEvidenceV1(r.evidence); if(r.evidence.artifactSha256!=null||r.evidence.mediaInspection!=null) fail('RESULT_TRUTH_BOUNDARY','failed cannot claim final artifact inspection','$.evidence'); if(r.evidence.requestId!==r.requestId||r.evidence.jobId!==r.jobId) fail('EVIDENCE_MISMATCH','evidence identity mismatch','$.evidence'); validateError(r.error,'$.error'); }
  else { if(r.artifact!=null||r.evidence!=null) fail('RESULT_TRUTH_BOUNDARY',`${r.status} cannot claim terminal artifact evidence`,'$'); if(r.status!=='cancelled'&&r.error!=null) fail('RESULT_TRUTH_BOUNDARY',`${r.status} cannot claim terminal error`,'$.error'); if(r.status==='cancelled'&&r.error!=null) validateError(r.error,'$.error'); }
  if(request){ validateMediaRenderRequestV1(request); if(request.requestId!==r.requestId) fail('EVIDENCE_MISMATCH','requestId mismatch','$.requestId'); if(['succeeded','failed'].includes(r.status)&&r.evidence.inputManifestDigest!==request.inputManifestDigest) fail('EVIDENCE_MISMATCH','input manifest mismatch','$.evidence.inputManifestDigest'); if(r.status==='succeeded'){const o=request.outputProfile; if(r.artifact.width!==o.width||r.artifact.height!==o.height||r.artifact.container!==o.container) fail('EVIDENCE_MISMATCH','artifact output profile mismatch','$.artifact'); if(o.videoCodec&&r.artifact.videoCodec!==o.videoCodec) fail('EVIDENCE_MISMATCH','video codec mismatch','$.artifact.videoCodec'); if(o.audioCodec&&r.artifact.audioCodec!==o.audioCodec) fail('EVIDENCE_MISMATCH','audio codec mismatch','$.artifact.audioCodec'); const v=r.evidence.mediaInspection.streams.find(x=>x.type==='video'); if(v?.frameRate!==undefined&&Math.abs(v.frameRate-o.fps)>.001) fail('EVIDENCE_MISMATCH','frame rate mismatch','$.evidence.mediaInspection.streams'); } }
  return true;
};

export const normalizeMacRemotionStatusV1 = (status) => {
  const s=text(status,'status').toLowerCase(), map={queued:'queued',running:'running',completed:'succeeded',failed:'failed',cancelled:'cancelled'}; if(!map[s]) fail('STATUS_MAPPING_UNSUPPORTED',`unsupported Mac Remotion status: ${s}`,'status'); return map[s];
};
