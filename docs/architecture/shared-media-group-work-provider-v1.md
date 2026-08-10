# Shared Media Group Work Provider v1

## Purpose

Provide the missing provider-owned response boundary between accepted Shared Media render truth and TradeOS `group.work-provider.response.v1` consumption.

```text
group.work-provider.request.v1
+ provider access decision
+ canonical media.render.v1 result(s)
+ source observation / provenance
→ #111 shared-media.group-work-item.v1
→ group.work-provider.response.v1
```

This package is a pure response adapter. It creates no render job, persistence, HTTP server, database, event bus, cross-domain write, publication action or authority grant.

## Existing truth owners reused

```text
media.render.v1 request/result/evidence
  packages/shared-media-render-contract

canonical terminal evidence closure
  packages/shared-media-evidence-collector

Mac transport compatibility / authorization boundary
  packages/shared-media-mac-compatibility

Group service/work projection
  packages/shared-media-group-service-adapter (#111)

TradeOS consumer transport
  chaintrace-app #665
```

No owner above is duplicated.

## Request contract

The v1 provider path accepts only:

```text
schema                     group.work-provider.request.v1
provider                   shared-media
consumerDomain             tradeos
purpose                    work_inbox
requestedSourceSchemas     [shared-media.group-work-item.v1]
readOnly                   true
crossDomainAccessPregranted false
persistencePerformed       false
externalActionPerformed    false
```

Federation correlation must be `valid + fresh` before any provider data projection. This verifies correlation freshness only; it is not data access authority.

## Access boundary

Provider access is separately represented as:

```text
allowed | denied | unknown
```

An `allowed` decision requires a `shared-media:access-decision:*` receipt. Denied/unknown access cannot carry work items. Unknown access cannot fabricate an access-decision receipt.

Possession of a federation link, request ID, job ID or render reference is never treated as access authority.

## Canonical result boundary

Every result that becomes a group Work item passes the existing #111 adapter, which itself calls `validateMediaRenderResultV1`.

Therefore:

```text
Mac transport completed
!= media.render.v1 succeeded
```

A `succeeded` result requires canonical artifact SHA, ffprobe inspection and render-log evidence. A transport-shaped `{status: completed}` object is rejected.

## Work semantics

Existing #111 mappings remain authoritative:

```text
queued    -> pending / monitor_render
running   -> in_progress / monitor_render
succeeded -> awaiting_human_review / review_rendered_candidate
failed    -> blocked / inspect_render_failure
cancelled -> cancelled / none
```

Technical success never becomes approval/publication.

## Response envelope

The adapter emits exactly the consumer-compatible envelope:

```text
schema                       group.work-provider.response.v1
provider                     shared-media
consumerOrganizationRef      exact request scope
accessDecision               allowed | denied | unknown
availability                 available | unavailable | unknown
freshness                    fresh | stale
sourceSchema                 shared-media.group-work-item.v1 when available
workItems[]                  existing #111 projections only
provenanceRefs[]             bounded safe refs
readOnly                     true
providerTruthOwnedExternally true
persistencePerformed         false
crossDomainWritePerformed    false
authorityGrantCreated        false
executionAuthorized          false
externalActionPerformed      false
```

The response does not carry an artifact locator, raw backend error text, social-account secret, publication credential or consumer-domain decision.

## Relationship to TradeOS

TradeOS #665 remains the consumer/timeout/error-normalization owner. This package does not implement TradeOS Work Inbox logic.

After this response adapter is accepted, a separate concrete invocation slice may connect an authoritative Shared Media result reader to TradeOS's injected provider invoker. That later slice must not invent a new lifecycle store or accept transport-only completion as canonical success.

## Non-goals

- no HTTP endpoint in v1;
- no new media lifecycle persistence;
- no render submission/cancel;
- no Mac runtime operation;
- no artifact read/ffprobe operation;
- no PR/Growth narrative decision;
- no human review completion;
- no publication;
- no Production external action;
- no payment, settlement, wallet, token or chain action.
