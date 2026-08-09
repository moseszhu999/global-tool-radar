# Shared Media Mac Staging Bridge v1

This package is the transport-specific boundary between a verified Shared Media Remotion materialization candidate and a **later, separately authorized** Mac pre-materialized binding.

```text
exact render plan
+ preparation manifest
+ prepared inputs receipt
+ prepared qualification receipt
+ Remotion materialization candidate v2
        ↓
Mac staging candidate v1
        ↓
observed staging manifest
        ↓
separate approval / binding creation
        ↓
Mac render_existing transport
        ↓
Evidence Collector
```

## What this package owns

It compiles a deterministic staging plan containing:

- safe Mac project name;
- exact composition ID;
- exact duration/output profile;
- prepared asset staging paths and SHA-256/byte lengths;
- generated project file paths, content, SHA-256 and byte lengths;
- audited Mac runtime identity (`server.mjs` and OpenAPI SHA-256);
- source-chain evidence references;
- explicit `approvalRequired=true`.

The candidate is a **staging instruction/evidence object**, not a binding and not a render request.

## What it deliberately does not own

It does not:

- create `approved_pre_materialized` bindings;
- call `createMacPreMaterializedBindingV1`;
- create `/v1/render` requests;
- call the Mac server;
- create or update a Remotion project;
- copy files;
- resolve filesystem paths;
- call TTS, ASR, caption or asset providers;
- submit a render;
- claim render authorization;
- claim artifact success;
- publish media;
- infer TrainingOS/ToolRadar business outcomes.

The package therefore contains no filesystem, network or process I/O.

## Exact source authority

The staging compiler first validates and re-verifies:

```text
canonical media.render.v1 plan
preparation manifest
prepared inputs receipt
prepared qualification receipt
Remotion materialization candidate v2
```

The materialization candidate is independently re-derived from that exact source chain before a staging candidate is produced.

A staging candidate therefore cannot be transferred from one lesson/render request to another merely by changing its digest.

## Prepared asset staging

Materialization v2 uses deterministic paths such as:

```text
assets/prepared-voice-1.wav
```

The Mac staging bridge turns those into project-relative public paths:

```text
public/assets/prepared-voice-1.wav
```

The bridge preserves the exact artifact ID, source ID, media type, SHA-256 and byte length. A later staging executor must copy the prepared bytes and independently verify this manifest.

## Generated project staging

The candidate carries exactly the generated files produced by materialization v2. The bridge records:

```text
path
sha256(content bytes)
byteLength
content
```

No transformation is allowed at this layer.

## Mac runtime evidence

The bridge binds the already-audited Mac compatibility identity:

```text
serverMjsSha256
openapiSha256
```

It does not claim the current machine actually matches those identities. That requires a later runtime discovery/inspection receipt.

## Approval boundary

The output fixes:

```text
approvalRequired=true
bindingCreated=false
renderAuthorized=false
transportSubmissionAllowed=false
```

The next component may only create an `approved_pre_materialized` binding after:

1. the staging candidate is accepted;
2. the generated project files are observed and match their exact manifest;
3. every prepared input byte is observed and matches its exact SHA/length/source identity;
4. the audited Mac runtime identity is independently verified;
5. the separate authorization policy permits binding creation.

Only after those steps should `createMacPreMaterializedBindingV1` be called.

## Relationship to TrainingOS

TrainingOS should never construct this object itself. It submits the product-neutral `media.render.v1` request and receives the eventual bounded media evidence/receipt. Mac project paths, staging rules, runtime hashes and render transport remain Shared Media infrastructure concerns.

## Exact-head contract gate

The dedicated workflow proves 15/15 contracts on the exact PR head and explicitly checks:

- exact source-chain verification;
- deterministic project identity;
- prepared asset SHA/path preservation;
- generated file SHA/length preservation;
- audited Mac runtime identity;
- digest/evidence binding;
- re-signed source mismatch rejection;
- truth-boundary rejection of approval/binding/transport mutation;
- absence of Mac transport fields;
- absence of filesystem/network/process operations.

A green gate is not a Mac staging execution and is not evidence that a Mac machine actually rendered anything.
