# Shared Media Prepared Qualification Authority v1

This note defines what a serialized `shared-media.prepared-qualification.v1` receipt proves and, equally importantly, what it does not prove.

## Three levels of evidence

### 1. Standalone receipt consistency

`validatePreparedQualificationReceiptV1(receipt)` proves structural and internal consistency of the receipt, including its deterministic digest, conservative audio-window arithmetic and immutable no-stretch/no-trim policy.

It does **not** prove that detached fields came from the original prepared source or from an actual inspector observation.

### 2. Exact prepared-source binding

`validatePreparedQualificationReceiptV1(receipt, {plan, manifest, preparedReceipt})` additionally binds:

- request / render-plan / preparation / prepared-input identities;
- visual artifact ID, SHA and media type;
- synthesized voice artifact ID, SHA, media type, segment, source shot, playback start and target window;
- caption qualification mode/format/cue count to the prepared caption result.

This prevents a re-signed detached receipt from substituting prepared source evidence while retaining the same upstream chain.

### 3. Measurement authority

Neither a plain SHA nor exact upstream source binding can independently prove that a serialized `actualDurationSeconds`, image width/height or other inspector observation was actually measured by the trusted inspector.

For example, a caller can modify:

```text
actualDurationSeconds
actualDurationMsCeil
trailingSilenceMs
qualificationDigest
```

into another internally consistent set. The upstream prepared artifact is unchanged, so exact source binding alone cannot reconstruct the original measured duration.

Therefore a later materializer must **not** treat an arbitrary detached qualification JSON as independent measurement authority.

For v1, acceptable use is:

```text
exact plan + manifest + prepared payloads
→ fresh createPreparedMediaQualifierV1(...) in the same trusted execution flow
→ immediately consume the returned qualification receipt for materialization
```

If qualification must cross a process/trust boundary, a future contract must add independently attestable inspector evidence, such as a signed/immutable inspector receipt tied to:

```text
prepared artifact SHA
inspector identity/version
measurement parameters
measurement result
timestamp / execution identity
```

That attestation is intentionally not invented in v1.

## Why this is preferable to stronger-looking hashes

Re-hashing caller-editable fields would only prove that the edited fields agree with the new hash. It would create false confidence rather than measurement provenance.

The v1 truth boundary is therefore explicit:

```text
qualificationDigest = integrity
exact prepared source chain = source authority
fresh trusted qualification / future inspector attestation = measurement authority
```

## Consequence for the next full materializer

The next Shared Media materializer owner must require either:

1. a fresh qualification result produced in the same trusted execution flow from the exact prepared payloads; or
2. a future independently attestable inspector receipt.

It must not accept detached serialized qualification data alone as proof of measured media properties.
