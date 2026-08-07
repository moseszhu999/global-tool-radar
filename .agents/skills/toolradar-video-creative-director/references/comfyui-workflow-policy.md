# ComfyUI Workflow Policy

## Purpose

Use ComfyUI as a bounded visual-asset generator inside Shared Media. Do not let product code or the creative agent depend on arbitrary graph JSON.

## Default execution model

Prefer an approved workflow registry:

```text
workflowId
workflowVersion
workflowDigest
allowedParameters
requiredModels
requiredCustomNodes
referenceAssetPolicy
outputProfile
```

The agent selects a workflow and supplies allowed parameters. The workflow structure is controlled separately.

## Promotion rule

Generation success is not a quality pass.

Before an AI-generated asset is promoted into a canonical ToolRadar video, compare it against a deterministic baseline under a controlled variable whenever practical.

A generated candidate may be rejected even when:
- inference succeeded;
- the file is technically valid;
- the model and workflow are reproducible.

## Accuracy-first visual policy

When a deterministic composition already has correct product focus, prefer reference-guided generation with bounded denoise instead of unconstrained text-to-image.

Use AI primarily for:
- material treatment;
- lighting;
- environmental depth;
- texture;
- atmosphere;
- non-factual decorative visual layers.

Do not delegate canonical UI copy, product state, ranking, metrics, logos, or factual interface text to image generation.

## Required provenance

Record:
- workflow ID/version/digest;
- model identifier and SHA-256;
- known model source and license identifier;
- seed;
- prompt / negative prompt;
- reference asset SHA-256;
- generation parameters including denoise where applicable;
- output SHA-256;
- generation log / job identifier;
- custom-node list.

Unknown licensing must remain `commercialSafetyApproved=false`.

## Custom-node policy

Default: no custom nodes.

A custom node may enter an approved workflow only after its source, necessity, executable code risk, version, and transitive dependencies are reviewed. Custom nodes execute code and must not be treated as passive media assets.

## MCP boundary

Do not expose raw ComfyUI graph mutation as the normal agent interface.

Preferred MCP-facing operations are capability-level tools such as:
- list approved workflows;
- inspect workflow manifest;
- generate an asset using an approved workflow and bounded parameters;
- inspect generation job;
- fetch immutable artifact metadata;
- cancel an owned generation job.

The MCP adapter should call the Shared Media / ComfyUI local API and enforce workflow/parameter allowlists. It should not provide a general `execute_arbitrary_graph` tool.

## Truth boundary

Keep separate:
- generated;
- technically validated;
- visually preferred;
- human approved;
- production asset approved;
- published;
- performance observed.
