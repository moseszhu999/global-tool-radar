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

    final_audio = voice.get("final_audio_evidence", {})
    for key in [
        "path",
        "sha256",
        "media_identity_status",
        "ffprobe_status",
        "codec",
        "sample_rate_hz",
        "channels",
        "duration_sec",
    ]:
        if key not in final_audio:
            errors.append(f"voice final audio evidence missing: {key}")
    if final_audio.get("media_identity_status") != "UNPROVED":
        errors.append("voice final audio identity template must fail closed as UNPROVED")
    if final_audio.get("ffprobe_status") != "NOT_PROVED":
        errors.append("voice ffprobe template must fail closed as NOT_PROVED")

    timing_lock = voice.get("timing_lock", {})
    for key in ["status", "duration_source", "timeline_relocked", "captions_retimed", "final_mix_rebuilt"]:
        if key not in timing_lock:
            errors.append(f"voice timing lock contract missing: {key}")
    if timing_lock.get("status") != "NOT_PROVED":
        errors.append("voice timing lock template must fail closed as NOT_PROVED")
    if timing_lock.get("duration_source") != "final_audio_evidence.duration_sec":
        errors.append("voice timing lock duration source must bind to final_audio_evidence.duration_sec")
    for key in ["timeline_relocked", "captions_retimed", "final_mix_rebuilt"]:
        if timing_lock.get(key) is not False:
            errors.append(f"voice timing lock template must default {key}=false")
except Exception as exc:
    errors.append(f"voice carrier contract invalid: {exc}")

try:
    render = json.loads((root / "templates/render_spec.json").read_text(encoding="utf-8"))
    audio = render.get("audio", {})
    required_audio = {
        "voice_casting_contract": "voice_casting.json",
        "final_audio_evidence_ref": "voice_casting.json#final_audio_evidence",
        "timing_lock_ref": "voice_casting.json#timing_lock",
        "narration_identity_status": "UNPROVED",
        "final_voice_approval_status": "NOT_PROVED",
        "timeline_lock_status": "NOT_PROVED",
        "captions_retime_status": "NOT_PROVED",
        "final_mix_status": "NOT_PROVED",
    }
    for key, expected in required_audio.items():
        if audio.get(key) != expected:
            errors.append(f"render audio contract must default {key}={expected}")

    input_identity = render.get("input_manifest_identity", {})
    required_input_identity = {
        "input_manifest_digest": "",
        "identity_status": "UNPROVED",
        "render_spec_ref": "render_spec.json",
        "render_spec_sha256": "",
        "render_spec_identity_status": "UNPROVED",
        "final_audio_evidence_ref": "voice_casting.json#final_audio_evidence",
        "final_audio_evidence_digest": "",
        "final_audio_identity_status": "UNPROVED",
        "timing_lock_ref": "voice_casting.json#timing_lock",
        "timing_lock_evidence_digest": "",
        "timing_lock_identity_status": "UNPROVED",
        "voice_timing_cross_binding_status": "NOT_PROVED",
    }
    for key, expected in required_input_identity.items():
        if input_identity.get(key) != expected:
            errors.append(f"render input manifest identity must default {key}={expected}")

    blockers = set(render.get("preflight", {}).get("blockers", []))
    for blocker in [
        "FINAL_VOICE_APPROVAL_REQUIRED",
        "FINAL_AUDIO_IDENTITY_REQUIRED",
        "TIMING_LOCK_REQUIRED",
        "CAPTIONS_RETIME_REQUIRED",
        "FINAL_MIX_REBUILD_REQUIRED",
        "INPUT_MANIFEST_IDENTITY_REQUIRED",
        "RENDER_SPEC_IDENTITY_REQUIRED",
        "VOICE_TIMING_CROSS_BINDING_REQUIRED",
    ]:
        if blocker not in blockers:
            errors.append(f"render preflight missing fail-closed blocker: {blocker}")
except Exception as exc:
    errors.append(f"render voice/timing contract invalid: {exc}")

try:
    qc = json.loads((root / "templates/qc_report.json").read_text(encoding="utf-8"))
    final_render = qc.get("final_render_evidence", {})
    required_final_render = {
        "render_contract_family": "media.render.v1",
        "render_result_ref": "",
        "render_evidence_ref": "",
        "artifact_manifest_ref": "",
        "artifact_path": "",
        "artifact_sha256": "",
        "artifact_identity_status": "UNPROVED",
        "ffprobe_status": "NOT_PROVED",
        "width": 0,
        "height": 0,
        "fps": 0,
        "video_codec": "",
        "audio_codec": "",
        "duration_sec": 0,
        "input_manifest_digest": "",
        "render_log_sha256": "",
        "terminal_status": "NOT_PROVED",
    }
    for key, expected in required_final_render.items():
        if final_render.get(key) != expected:
            errors.append(f"final render evidence template must default {key}={expected}")

    cross_binding = qc.get("input_manifest_cross_binding", {})
    required_cross_binding = {
        "render_spec_ref": "render_spec.json",
        "render_spec_sha256": "",
        "render_spec_identity_status": "UNPROVED",
        "input_manifest_digest": "",
        "input_manifest_identity_status": "UNPROVED",
        "final_audio_evidence_ref": "voice_casting.json#final_audio_evidence",
        "final_audio_evidence_digest": "",
        "final_audio_identity_status": "UNPROVED",
        "timing_lock_ref": "voice_casting.json#timing_lock",
        "timing_lock_evidence_digest": "",
        "timing_lock_identity_status": "UNPROVED",
        "voice_timing_cross_binding_status": "NOT_PROVED",
        "render_input_cross_binding_status": "NOT_PROVED",
    }
    for key, expected in required_cross_binding.items():
        if cross_binding.get(key) != expected:
            errors.append(f"qc input manifest cross-binding must default {key}={expected}")

    final_human_review = qc.get("final_human_review_evidence", {})
    required_final_human_review = {
        "quality_report_contract": "toolradar.video-quality-report.v1",
        "quality_report_ref": "",
        "quality_report_media_sha256": "",
        "quality_report_media_identity_status": "UNPROVED",
        "automated_gate_status": "NOT_PROVED",
        "human_review_contract": "toolradar.final-human-review-receipt.v1",
        "human_review_receipt_ref": "",
        "human_review_media_sha256": "",
        "human_review_media_identity_status": "UNPROVED",
        "decision": "NOT_PROVED",
        "release_handoff_allowed": False,
        "publication_allowed": False,
    }
    for key, expected in required_final_human_review.items():
        if final_human_review.get(key) != expected:
            errors.append(f"final human review evidence template must default {key}={expected}")

    if qc.get("final_ready") is not False:
        errors.append("qc template must default final_ready=false")
    if qc.get("gates", {}).get("artifact_record") != "PENDING":
        errors.append("qc artifact_record gate must default PENDING")
    if qc.get("gates", {}).get("technical") != "PENDING":
        errors.append("qc technical gate must default PENDING")
    if qc.get("gates", {}).get("human_review") != "PENDING":
        errors.append("qc human_review gate must default PENDING")

    qc_blockers = set(qc.get("blockers", []))
    for blocker in [
        "FINAL_RENDER_ARTIFACT_IDENTITY_REQUIRED",
        "FINAL_RENDER_FFPROBE_REQUIRED",
        "FINAL_RENDER_TERMINAL_EVIDENCE_REQUIRED",
        "FINAL_RENDER_INPUT_MANIFEST_IDENTITY_REQUIRED",
        "FINAL_RENDER_SPEC_IDENTITY_REQUIRED",
        "FINAL_AUDIO_TIMING_CROSS_BINDING_REQUIRED",
        "FINAL_HUMAN_REVIEW_QUALITY_REPORT_REQUIRED",
        "FINAL_HUMAN_REVIEW_MEDIA_IDENTITY_REQUIRED",
        "FINAL_HUMAN_REVIEW_APPROVAL_REQUIRED",
    ]:
        if blocker not in qc_blockers:
            errors.append(f"qc template missing fail-closed blocker: {blocker}")
except Exception as exc:
    errors.append(f"final render/human review evidence contract invalid: {exc}")

if errors:
    print("FAIL")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("PASS")
print("ai-video-production-zh v2.0.0 canonical candidate package is structurally valid.")
