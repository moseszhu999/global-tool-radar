# Shared Media → AIEXE Runtime Observation Consumer v1

Status: P4.1 cross-repository exact-head fixture contract.

## Goal

Prove that current Shared Media can consume the evidence produced by the shared AIEXE Provider Runtime without copying AIEXE provider routing, authorization, credential, retry, or persistent-claim execution code into `global-tool-radar`.

The consumer contract is:

```text
current Shared Media read-only MCP result
+ exact AIEXE provider.execution.receipt.v1
+ exact AIEXE provider.execution.outcome.v1
+ exact AIEXE provider.execution.claim.v1
→ shared-media.aiexe-runtime-observation-evidence.v1
```

## Exact upstream fixture source

P4.1 is deliberately pinned to the current unmerged AIEXE P3.1 exact head:

```text
repository = moseszhu999/ai_exe_os
exactHead  = 28c7dd539a4a5f340a715a230bd05ce1c386d925
contractStatus = draft_exact_head_fixture
liveRuntimeInvoked = false
```

This fixture must not be described as a production AIEXE dependency or live-provider proof.

## Shared Media source truth

P4.1 consumes the already merged Shared Media MCP adapter. It does not modify its server/controller ownership.

Only these current read-only MCP tools are admitted:

```text
media_get_job
media_get_artifact
```

The current MCP server declares both as:

```text
readOnlyHint = true
destructiveHint = false
idempotentHint = true
openWorldHint = false
```

The following current tools are explicitly outside P4.1:

```text
media_generate_asset
media_cancel_job
```

`media_list_workflows` / `media_get_workflow` remain read-only Shared Media tools but are not part of this first result-evidence fixture because P4.1 is proving durable job/artifact observation evidence.

## Argument → result identity binding

A valid receipt digest is not enough if the observed result belongs to a different object.

The public consumer therefore requires:

```text
media_get_artifact(artifactId=X)
→ structuredContent.artifact.artifactId == X

media_get_job(jobId=X)
→ structuredContent.job.jobId == X
```

Identity drift fails before AIEXE evidence is accepted.

## AIEXE receipt verification

P4.1 requires exact:

```text
schema = provider.execution.receipt.v1
protocolFamily = mcp
protocolVersion = 2025-11-25
protocolOperation = tools/call
riskClass = observe
outcome = success
```

It also requires:

```text
authorizationEvaluated = true
humanGateDecisionCreated = false
networkPerformed = true
externalActionPerformed = false
automaticRetryPerformed = false
```

The consumer recomputes the AIEXE canonical SHA-256 receipt digest and verifies `executionRef` from that digest.

Most importantly:

```text
receipt.responseDigest
== AIEXE canonical digest(exact Shared Media MCP tools/call result)
```

So a valid receipt for one MCP result cannot be attached to another Shared Media result.

## AIEXE outcome verification

P4.1 requires exact:

```text
schema = provider.execution.outcome.v1
outcome = success
knownFailureKind = null
uncertainty = null
automaticRetryPerformed = false
reviewedRetryRequired = false
reviewedRetry = false
priorAttemptRef = null
```

The outcome must match the receipt for:

- request identity/digest;
- plan digest;
- provider identity/contract;
- protocol family/version/operation;
- semantic operation/risk;
- authorization evidence;
- endpoint/network/credential refs;
- provider request id;
- response digest.

The consumer recomputes the exact AIEXE outcome digest.

## Persistent claim verification

P4.1 requires exact terminal success:

```text
schema = provider.execution.claim.v1
status = success
outcomeClass = success
effectMayHaveOccurred = false
reviewedRetryRequired = false
recoveryReason = null
```

The claim must bind the exact outcome attempt/request/plan/outcome digests.

For this initial clean fixture:

```text
reviewedRetry = false
priorAttemptRef = null
claimSemanticKey = provider-initial-request:<requestDigest>
```

An `uncertain`, `recovery_required`, or `known_failure` persistent claim cannot be promoted into Shared Media observation truth.

## Shared Media technical truth boundary

The MCP result must retain current Shared Media technical-only fields:

```text
technicalResultOnly = true
humanDecisionInferred = false
consumerDomainDecisionInferred = false
businessOutcomeInferred = false
```

The consumer also rejects secret-shaped evidence and current legacy consumer-truth fields such as human approval, publication, or analytics truth.

## Output evidence

Schema:

```text
shared-media.aiexe-runtime-observation-evidence.v1
```

The output binds:

- exact AIEXE repository/head fixture source;
- exact Shared Media read-only tool;
- tool argument digest;
- Shared Media MCP result digest;
- request/plan/provider identity;
- attempt identity/digest;
- execution/receipt/outcome digests;
- persistent claim success + Workspace;
- observation timestamp;
- explicit no-generation/no-cancellation/no-publication/no-external-action boundaries.

The output is deterministic for the same exact evidence bundle.

## What this proves

P4.1 proves a real product repository can consume the exact current AIEXE shared-runtime evidence contract while using current Shared Media MCP technical results.

It does **not** prove that this package performed a live AIEXE runtime call.

The fixture explicitly records:

```text
runtimeInvokedByThisPackage = false
liveRuntimeInvokedInFixture = false
```

A later integration gate can replace the exact-head fixture evidence source with a callable/merged AIEXE distribution or deployed destination runtime without changing Shared Media domain truth ownership.

## Closed boundaries

```text
Shared Media MCP server rewrite       NO
AIEXE executor copy                   NO
AIEXE authorization copy              NO
credential resolution in Shared Media NO
media_generate_asset                  CLOSED
media_cancel_job                      CLOSED
internalWrite                         CLOSED
externalAction                        CLOSED
publication                           NO
live provider credentials             NO
merge                                 NO
deploy                                NO
```
