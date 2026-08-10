export const SHARED_MEDIA_CANONICAL_TERMINAL_RECEIPT_V1: "shared-media.canonical-terminal-receipt.v1";
export const SHARED_MEDIA_CANONICAL_RECEIPT_SLOT_V1: "shared-media.canonical-result-slot.v1";
export const EXPECTED_MAC_REMOTION_SERVER_SHA256: "bb0de1478cd2ce48ce6bcf0c17c9b7f5e5e811131448b3555dfdcee3a4c8510f";

export interface CanonicalTerminalReceiptV1 {
  readonly schemaVersion: "shared-media.canonical-terminal-receipt.v1";
  readonly requestId: string;
  readonly jobId: string;
  readonly inputManifestDigest: string;
  readonly terminalStatus: "succeeded" | "failed";
  readonly resultDigest: string;
  readonly collectedAt: string;
  readonly persistedAt: string;
  readonly canonicalResult: unknown;
  readonly technicalResultOnly: true;
  readonly humanReviewCompleted: false;
  readonly humanDecisionInferred: false;
  readonly consumerDomainDecisionInferred: false;
  readonly publicationAllowed: false;
  readonly publicationPerformed: false;
  readonly authorityGrantCreated: false;
  readonly externalActionPerformed: false;
  readonly receiptDigest: string;
}

export interface CanonicalReceiptSlotV1 {
  readonly schemaVersion: "shared-media.canonical-result-slot.v1";
  readonly writeDisposition: "created" | "idempotent_replay";
  readonly canonicalResultReceipt: CanonicalTerminalReceiptV1;
  readonly persistenceRequired: boolean;
  readonly crossDomainWritePerformed: false;
}

export function createCanonicalTerminalReceiptV1(input: {
  readonly request: unknown;
  readonly result: unknown;
  readonly persistedAt: string;
}): CanonicalTerminalReceiptV1;

export function writeCanonicalTerminalReceiptSlotV1(input: {
  readonly existingReceipt?: CanonicalTerminalReceiptV1 | null;
  readonly request: unknown;
  readonly result: unknown;
  readonly persistedAt: string;
}): CanonicalReceiptSlotV1;

export function recoverCanonicalTerminalReceiptV1(input: {
  readonly receipt: CanonicalTerminalReceiptV1;
  readonly request: unknown;
}): CanonicalTerminalReceiptV1;

export function readCanonicalTerminalReceiptV1(input: {
  readonly receipt: CanonicalTerminalReceiptV1;
  readonly request: unknown;
  readonly jobId: string;
  readonly isJobAuthorized: (input: Readonly<{
    requestId: string;
    inputManifestDigest: string;
    jobId: string;
    action: "read_canonical_terminal_receipt";
  }>) => boolean | Promise<boolean>;
}): Promise<CanonicalTerminalReceiptV1>;

export function buildSharedMediaProviderResponseFromCanonicalReceiptsV1(input: {
  readonly providerRequest: unknown;
  readonly accessDecision: "allowed" | "denied" | "unknown";
  readonly accessDecisionRef?: string;
  readonly availability: "available" | "unavailable" | "unknown";
  readonly provenanceRefs: readonly string[];
  readonly observedAt: string;
  readonly maxAgeSeconds?: number;
  readonly receiptBindings?: readonly Readonly<{
    projectionRef: string;
    workItemRef: string;
    request: unknown;
    receipt: CanonicalTerminalReceiptV1;
  }>[];
  readonly isJobAuthorized?: (input: Readonly<{
    requestId: string;
    inputManifestDigest: string;
    jobId: string;
    action: "read_canonical_terminal_receipt";
  }>) => boolean | Promise<boolean>;
}): Promise<unknown>;

export function validateMacCanonicalReceiptRolloutTargetV1(input: {
  readonly serverSha256: string;
  readonly gitRepositoryObserved: boolean;
}): Readonly<{
  schemaVersion: "shared-media.mac-canonical-receipt-rollout-target.v1";
  expectedServerSha256: string;
  backupRequired: true;
  nodeCheckRequired: true;
  alternatePortVerificationRequired: true;
  healthCheckRequired: true;
  rollbackRequired: true;
  renderSubmissionAuthorized: false;
  serviceRestartAuthorized: false;
  runtimeMutationAuthorized: false;
}>;
