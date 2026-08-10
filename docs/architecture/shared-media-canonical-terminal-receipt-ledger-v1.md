# Shared Media Canonical Terminal Receipt Ledger v1

## Purpose

Close the durability gap between the accepted in-memory terminal evidence collector (#95) and the accepted Group Work provider response (#114), without introducing a new database or treating Mac transport completion as canonical render success.

```text
Mac durable JSON job ledger
+ #95 canonical media.render.v1 terminal result
→ immutable canonicalResultReceipt slot
→ startup recovery revalidation
→ separately authorized canonical receipt read
→ #114 group.work-provider.response.v1
→ TradeOS #665
```

This source slice defines the ledger extension contract and a read-only rollout preflight. It does **not** mutate or restart the live Mac runtime.

## Evidence basis

Read-only Mac audits on the live `mac-remotion-action` service proved:

```text
server SHA-256
  bb0de1478cd2ce48ce6bcf0c17c9b7f5e5e811131448b3555dfdcee3a4c8510f

existing durability
  in-memory Map               YES
  filesystem read/write       YES
  JSON ledger read/write      YES
  startup recovery            YES
  SQLite/Postgres/Redis       NO

canonical terminal receipt fields in current server
  media.render.v1             NO
  inputManifestDigest         NO
  artifactSha256              NO
  mediaInspection / ffprobe   NO
  renderLog evidence field    NO

runtime source ownership
  Git repository              NO
  Git remote/head             NO
```

Therefore the correct next move is to reuse the existing JSON ledger, not add a database, while keeping the unmanaged local server behind an exact-SHA controlled rollout.

## Canonical receipt

Schema:

```text
shared-media.canonical-terminal-receipt.v1
```

A receipt can be created only from an accepted `media.render.v1` terminal result whose request passes `validateMediaRenderRequestV1` and whose result passes `validateMediaRenderResultV1(result, {request})`.

Persisted identities:

```text
requestId
jobId
inputManifestDigest
terminalStatus = succeeded | failed
resultDigest
evidence collectedAt
receipt persistedAt
canonicalResult
receiptDigest
```

The canonical result is scanned again at the durability boundary for secret-shaped fields and values. Signed URLs, bearer/token/cookie/API-key/password material cannot be persisted even if an upstream caller changes later.

## Terminal-only rule

```text
Mac completed            != canonical succeeded
media.render.v1 queued   != durable terminal receipt
media.render.v1 running  != durable terminal receipt
```

Only canonical `succeeded` or `failed` results may enter the terminal receipt slot.

## Idempotency and conflict

First canonical terminal write:

```text
writeDisposition = created
persistenceRequired = true
```

An identical replay for the same request/job/input-manifest/result digest is accepted even if the retry happens later:

```text
writeDisposition = idempotent_replay
persistenceRequired = false
original persistedAt retained
```

Different canonical terminal content under the same identity fails closed:

```text
CANONICAL_TERMINAL_RECEIPT_CONFLICT
```

This prevents a durable terminal result from silently changing after it has been accepted.

## Startup recovery

`recoverCanonicalTerminalReceiptV1()` revalidates:

- the canonical request/result contract;
- request/job/input manifest identity;
- terminal status;
- result digest;
- receipt digest;
- technical-only / no-authority / no-publication boundary flags;
- secret-shaped durable material.

A tampered or widened receipt fails closed and must not be exposed to consumers.

## Read authorization

Knowing `jobId` is not permission.

`readCanonicalTerminalReceiptV1()` requires a separate `isJobAuthorized` decision for the exact tuple:

```text
requestId
inputManifestDigest
jobId
action = read_canonical_terminal_receipt
```

The reader returns the validated canonical receipt only. It does not return the raw Mac job record/ledger payload.

## Provider handoff

`buildSharedMediaProviderResponseFromCanonicalReceiptsV1()` reads authorized canonical receipts and delegates the result to the already accepted #114 response adapter. It does not duplicate Shared Media Work projection logic.

A canonical `succeeded` receipt therefore remains:

```text
awaiting_human_review
publicationAllowed = false
publicationPerformed = false
```

A canonical `failed` receipt becomes blocked work. Denied/unknown/non-available provider access never reads or smuggles receipts.

## Fixed truth boundary

Every terminal receipt fixes:

```text
technicalResultOnly = true
humanReviewCompleted = false
humanDecisionInferred = false
consumerDomainDecisionInferred = false
publicationAllowed = false
publicationPerformed = false
authorityGrantCreated = false
externalActionPerformed = false
```

Receipt durability never creates HumanGate, AuthorityGrant, publication approval or consumer-domain business truth.

## Mac rollout boundary

The live runtime is not Git-managed. This PR therefore includes only:

```text
mac-remotion-rollout-manifest.v1.json
mac-remotion-rollout-preflight-v1.mjs
```

The preflight is read-only. It hashes the supplied `server.mjs`, checks whether the directory unexpectedly became Git-managed, and refuses anything except the audited exact server SHA.

A later rollout must require all of:

```text
exact SHA match
backup before mutation
node --check before activation
alternate-port verification
health check after activation
restart recovery receipt validation
deterministic rollback
```

The source PR explicitly authorizes none of:

```text
runtime mutation
service restart
render submission
publication
Production external action
```

No locally applicable hot patch is represented as accepted until a separate rollout carrier proves backup/syntax/health/rollback on the exact live server.
