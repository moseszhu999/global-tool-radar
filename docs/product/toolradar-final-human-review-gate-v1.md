# ToolRadar Final Human Review Gate v1

## Purpose

Turn the final M10 human review from an informal checklist into a source-bound receipt without pretending that review equals publication.

## Input

- one `toolradar.video-quality-report.v1`;
- the exact media SHA-256 from that report;
- a named human reviewer;
- seven explicit review decisions.

## Required human checks

1. visuals match the approved script;
2. subtitles are accurate;
3. final voice is approved;
4. claims match the evidence;
5. no sensitive data is visible;
6. copyright and ownership boundaries are respected;
7. platform copy is approved.

## Truth boundary

The receipt can only allow release handoff when:

- automated QA passed;
- every human check passed;
- the upstream quality report contains no blocker.

The current Replit Design preview remains blocked because it still reports owned screen recordings, final voice approval, and human quality review as unresolved. Checking every human item cannot erase those upstream blockers.

## Authority boundary

The receipt always keeps `publicationAllowed=false`. Approval only enables the next handoff to platform-account authorization. It cannot log in, upload, create a draft, publish, collect analytics, or infer that any platform action occurred.
