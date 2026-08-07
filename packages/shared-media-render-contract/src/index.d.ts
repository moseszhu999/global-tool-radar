export const MEDIA_RENDER_V1: 'media.render.v1';
export const MEDIA_RENDER_INPUT_MANIFEST_V1: 'media.render.input-manifest.v1';
export const MEDIA_RENDER_STATUSES: readonly ['queued', 'running', 'succeeded', 'failed', 'cancelled'];
export const MEDIA_RENDER_ERROR_STAGES: readonly ['validation', 'voice', 'captions', 'timeline', 'render', 'inspect', 'artifact', 'unknown'];

export type MediaRenderStatusV1 = typeof MEDIA_RENDER_STATUSES[number];
export type MediaRenderErrorStageV1 = typeof MEDIA_RENDER_ERROR_STAGES[number];
export type Sha256Hex = string;

export interface MediaVisualAssetV1 {
  assetId: string;
  kind: 'image' | 'video' | 'code' | 'slide' | 'screen' | 'graphic' | 'other';
  locator: string;
  mediaType?: string;
  sha256: Sha256Hex;
}

export type MediaNarrationV1 =
  | {mode: 'text'; text: string}
  | {mode: 'none'; text?: never};

export interface MediaShotV1 {
  shotId: string;
  order: number;
  durationMs?: number;
  narration: MediaNarrationV1;
  visualAssetIds: string[];
  captionCueIds?: string[];
}

export type MediaVoiceV1 =
  | {mode: 'synthesize'; provider: string; voiceId: string; locale?: string; rate?: number}
  | {mode: 'provided'; audioAsset: {assetId: string; locator: string; mediaType: string; sha256: Sha256Hex}}
  | {mode: 'none'};

export type MediaCaptionsV1 =
  | {mode: 'auto'; format: 'burn-in' | 'srt' | 'vtt'; language?: string}
  | {mode: 'provided'; format: 'burn-in' | 'srt' | 'vtt'; language?: string; captionAsset: {assetId: string; locator: string; mediaType: string; sha256: Sha256Hex}}
  | {mode: 'none'; format: 'none'; language?: string};

export interface MediaOutputProfileV1 {
  profileId: string;
  width: number;
  height: number;
  fps: number;
  container: string;
  videoCodec?: string;
  audioCodec?: string;
}

export interface MediaRenderRequestV1 {
  contractVersion: 'media.render.v1';
  messageType: 'request';
  requestId: string;
  purpose: string;
  title?: string;
  language: string;
  shots: MediaShotV1[];
  visualAssets: MediaVisualAssetV1[];
  voice: MediaVoiceV1;
  captions: MediaCaptionsV1;
  outputProfile: MediaOutputProfileV1;
  evidenceRequirements: {
    requireMediaInspection: true;
    requireSha256: true;
    requireRenderLog: true;
    requireInputManifestDigest: true;
  };
  inputManifestDigest: Sha256Hex;
}

export interface MediaInspectionStreamV1 {
  index: number;
  type: 'video' | 'audio' | 'subtitle' | 'data' | 'attachment' | 'unknown';
  codecName: string;
  width?: number;
  height?: number;
  frameRate?: number;
  sampleRate?: number;
  channels?: number;
}

export interface MediaRenderEvidenceV1 {
  contractVersion: 'media.render.v1';
  messageType: 'evidence';
  requestId: string;
  jobId: string;
  inputManifestDigest: Sha256Hex;
  artifactSha256?: Sha256Hex | null;
  mediaInspection?: {
    tool: 'ffprobe';
    status: 'passed';
    toolVersion?: string;
    inspectedAt: string;
    format: {durationSeconds: number; sizeBytes: number; formatName?: string};
    streams: MediaInspectionStreamV1[];
  } | null;
  renderLog: {sha256: Sha256Hex; locator?: string; byteLength?: number};
  collectedAt: string;
}

export interface MediaRenderArtifactV1 {
  artifactId: string;
  locator: string;
  mediaType: string;
  byteLength: number;
  sha256: Sha256Hex;
  durationSeconds: number;
  width: number;
  height: number;
  container: string;
  videoCodec: string;
  audioCodec?: string;
}

export interface MediaRenderErrorV1 {
  code: string;
  stage: MediaRenderErrorStageV1;
  message: string;
  retryable: boolean;
}

export interface MediaRenderResultV1 {
  contractVersion: 'media.render.v1';
  messageType: 'result';
  requestId: string;
  jobId: string;
  status: MediaRenderStatusV1;
  startedAt?: string | null;
  finishedAt?: string | null;
  artifact?: MediaRenderArtifactV1 | null;
  evidence?: MediaRenderEvidenceV1 | null;
  error?: MediaRenderErrorV1 | null;
}

export class MediaRenderContractError extends TypeError {
  code: string;
  path: string | null;
}

export function stableStringifyV1(value: unknown): string;
export function sha256CanonicalJsonV1(value: unknown): Sha256Hex;
export function assertNoForbiddenDomainFieldsV1(value: unknown, path?: string): true;
export function buildMediaRenderInputManifestV1(request: MediaRenderRequestV1): unknown;
export function computeMediaRenderInputManifestDigestV1(request: MediaRenderRequestV1): Sha256Hex;
export function createMediaRenderRequestV1(input: Omit<MediaRenderRequestV1, 'contractVersion' | 'messageType' | 'evidenceRequirements' | 'inputManifestDigest'>): Readonly<MediaRenderRequestV1>;
export function validateMediaRenderRequestV1(request: MediaRenderRequestV1, options?: {verifyDigest?: boolean}): true;
export function validateMediaRenderEvidenceV1(evidence: MediaRenderEvidenceV1): true;
export function validateMediaRenderResultV1(result: MediaRenderResultV1, options?: {request?: MediaRenderRequestV1 | null}): true;
export function normalizeMacRemotionStatusV1(status: string): MediaRenderStatusV1;
