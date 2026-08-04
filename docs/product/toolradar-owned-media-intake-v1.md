# ToolRadar Owned Media Intake v1

## Purpose

Convert the remaining M9 blocker into a source-bound handoff for the exact final render inputs. The intake does not record screens, approve voice, upload media, or publish anything. It only validates evidence supplied by the human owner.

## Required screen recordings

The Replit Design case requires exactly three owned recordings:

1. `replit_prompt_to_build` — the prompt-to-build interaction;
2. `replit_live_preview` — the generated live preview;
3. `replit_iteration_result` — the visible result after one iteration.

Each clip must include a local filename, SHA-256 digest, positive duration, and explicit confirmation that the submitter owns the recording.

## Required voice asset

The final voice file must include a local filename and SHA-256 digest, plus explicit confirmation that it is approved and owned or licensed.

## Decision

The receipt returns `READY_FOR_FINAL_RENDER` only when all three clips and the final voice pass validation. Otherwise it preserves the existing blockers:

- `OWNED_SCREEN_RECORDINGS_REQUIRED`;
- `FINAL_VOICE_APPROVAL_REQUIRED`.

## Authority boundary

The receipt keeps `publicationAllowed=false`. It can authorize only the final render step. M10 automated QA, final human review, platform authorization, upload, publication, and analytics remain separate gates.
