# Shared Media Mac Canonical Receipt Runtime v1

Issue owner: #115. This slice turns the already-accepted canonical terminal receipt contract into a deterministic patch for the existing unmanaged Mac Remotion runtime without creating a new database or a second job store.

## Audited live runtime

Exact source SHA-256:

`bb0de1478cd2ce48ce6bcf0c17c9b7f5e5e811131448b3555dfdcee3a4c8510f`

Read-only audit proved the runtime persists each job under its existing JSON ledger and recovers jobs through `loadJob()`. The current server has no canonical `media.render.v1` terminal receipt fields.

## v1 design

The patch reuses the existing `job.json` record and adds only one optional field:

`canonicalResultReceipt`

No SQLite, Postgres, Redis, new service or second job registry is introduced.

A receipt is accepted only if it already conforms to `shared-media.canonical-terminal-receipt.v1`. The runtime validator injects the accepted `validateMediaRenderResultV1` implementation and then rechecks:

- terminal status is only `succeeded|failed`;
- requestId/jobId/inputManifestDigest identities tie;
- accepted media.render.v1 result validation passes on every read/recovery;
- resultDigest and receiptDigest recompute exactly;
- collectedAt/persistedAt are valid and ordered;
- secret-shaped fields/values are absent;
- human review/publication/authority/external-action boundaries remain false.

The original transport status remains independent. `completed` is not converted into canonical `succeeded` by the patch.

## Routes

Both routes remain behind the runtime's existing Bearer authorization gate, so knowing a job ID is not sufficient.

- `POST /v1/jobs/:jobId/canonical-result` accepts exactly one already-issued `canonicalResultReceipt`. First write persists through the existing `updateJob -> persistJob -> job.json` path. Identical replay is idempotent. Different terminal truth fails closed.
- `GET /v1/jobs/:jobId/canonical-result` returns only the validated canonical receipt or `canonical_result_not_ready`. It does not return the raw internal job object.

The existing `GET /v1/jobs/:jobId` remains transport-only and does not expose canonical receipt content.

## Restart/recovery boundary

`loadJob()` is patched so any stored canonical receipt is revalidated every time the durable job record is loaded. A malformed/tampered receipt therefore fails closed after restart instead of silently becoming trusted state.

## Source PR boundary

This branch contains only a runtime validator and deterministic exact-SHA patcher. It does not touch the live Mac directory, restart the service, submit a render or publish anything.

A later disposable Mac rollout must separately prove:

1. exact pre-patch server SHA;
2. local backup before mutation;
3. deterministic patched server SHA;
4. runtime validator + accepted render-contract module installed beside server.mjs;
5. `node --check` on all installed modules;
6. alternate-port boot/health before replacing the live process;
7. first-write + idempotent replay + conflict denial using a non-production fixture job;
8. restart recovery of the persisted receipt;
9. existing transport status route remains unchanged;
10. deterministic rollback restores the original SHA and health.

No render submission, human approval, publication, payment, settlement, wallet/token or Production business action is authorized by this source slice.
