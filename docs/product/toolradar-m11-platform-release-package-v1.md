# ToolRadar M11 Platform Release Package v1

## Runtime

```text
production case
+ render package
+ render receipt
+ M10 quality report
→ platform-specific technical preflight
→ immutable media SHA-256 binding
→ Douyin/Bilibili copy package
→ explicit authorization checklist
→ blocked release package Artifact
```

## What this closes

- prepares one auditable release package for Douyin and Bilibili;
- binds platform copy to the exact rendered media digest;
- checks container, duration, size, orientation and copy presence;
- carries all upstream M9/M10 blockers forward;
- produces a machine-readable handoff for a later authorized uploader.

## Authority boundary

This runtime does not authenticate an account, request OAuth permission, upload a file, create a draft or publish content. Both `uploadAllowed` and `publicationAllowed` are fixed to `false`.

A later human-authorized flow must verify all of the following:

1. final owned screen recordings replaced every placeholder;
2. final voice approved;
3. final video and copy reviewed;
4. the operator authenticated the target account;
5. the target platform permission was granted;
6. the operator approved the exact SHA-256;
7. the operator explicitly confirmed the publish action.

## Current first-case state

The Replit Design preview is expected to pass both platform technical preflights while remaining `BLOCKED_BEFORE_UPLOAD`, because it is still a preview with three owned-recording placeholders and no final publication authority.

## External contract

The Douyin package records the official Open Platform publication-solution documentation and `video.create` authorization requirement. Bilibili remains a manual-account handoff until a verified official publishing API contract is adopted.
