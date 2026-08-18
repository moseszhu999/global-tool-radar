#!/usr/bin/env python3
from pathlib import Path
import json, sys

root = Path(__file__).resolve().parents[1]
errors = []

required = [
    "SKILL.md", "README.md", "CHANGELOG.md",
    "templates/creative_brief.json",
    "templates/asset_manifest.json",
    "templates/shot_asset_binding.json",
    "templates/voice_casting.json",
    "templates/render_spec.json",
    "templates/qc_report.json",
    "templates/asset_usage_receipt.json",
]
for rel in required:
    if not (root / rel).exists():
        errors.append(f"missing: {rel}")

skill = (root / "SKILL.md").read_text(encoding="utf-8")
checks = {
    "version 2.0.0": "version: 2.0.0" in skill,
    "asset promotion": "media.asset.promotion.v1" in skill,
    "binding": "media.shot.asset-binding.v1" in skill,
    "usage receipt": "media.asset.usage-receipt.v1" in skill,
    "3D": "GLB / glTF / Blender Scene" in skill,
    "voice gate": "Voice Casting Gate" in skill,
    "no placeholder": "allow_placeholder_in_final" in skill,
    "preview final split": "PREVIEW_ONLY" in skill and "FINAL_CANDIDATE" in skill,
}
for name, ok in checks.items():
    if not ok:
        errors.append(f"contract check failed: {name}")

for path in (root / "templates").glob("*.json"):
    try:
        json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"invalid json {path.name}: {exc}")

try:
    voice = json.loads((root / "templates/voice_casting.json").read_text(encoding="utf-8"))
    carrier = voice.get("carrier_evidence", {})
    for key in [
        "carrier_repo",
        "carrier_exact_head",
        "carrier_exact_head_locked",
        "external_media_identity_refetched_by_this_workflow",
        "cross_repo_credential_added",
    ]:
        if key not in carrier:
            errors.append(f"voice carrier contract missing: {key}")

    candidates = voice.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        errors.append("voice carrier contract requires a candidate evidence shape")
    else:
        candidate = candidates[0]
        for key in ["voice_id", "source_path", "source_locator", "expected_sha256", "media_identity_status", "human_listening_status"]:
            if key not in candidate:
                errors.append(f"voice candidate contract missing: {key}")

    approval = voice.get("final_voice_approval", {})
    if approval.get("status") != "NOT_PROVED":
        errors.append("voice final approval template must fail closed as NOT_PROVED")
except Exception as exc:
    errors.append(f"voice carrier contract invalid: {exc}")

if errors:
    print("FAIL")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("PASS")
print("ai-video-production-zh v2.0.0 canonical candidate package is structurally valid.")
