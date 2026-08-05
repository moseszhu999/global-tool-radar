import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function assertSha256(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a lowercase SHA-256 digest`);
  }
}

async function sha256File(filename) {
  const bytes = await readFile(filename);
  return createHash("sha256").update(bytes).digest("hex");
}

export async function buildFinalRenderPreflight({ handoff, resolvePath = (value) => value }) {
  if (handoff?.schemaVersion !== "toolradar.final-render-handoff.v1") {
    throw new TypeError("supported final render handoff is required");
  }
  if (handoff.renderExecutionAllowed !== true || handoff.decision !== "READY_FOR_FINAL_RENDER_EXECUTION") {
    throw new TypeError("render-executable handoff is required");
  }
  if (handoff.publicationAllowed !== false || handoff.humanReviewRequiredAfterRender !== true) {
    throw new TypeError("handoff truth boundary is invalid");
  }

  const inputs = [];
  for (const replacement of handoff.replacements ?? []) {
    assertSha256(replacement.sourceSha256, `${replacement.shotId}.sourceSha256`);
    const localPath = resolvePath(replacement.sourceFilename);
    const observedSha256 = await sha256File(localPath);
    inputs.push(Object.freeze({
      kind: "video",
      shotId: replacement.shotId,
      localPath,
      expectedSha256: replacement.sourceSha256,
      observedSha256,
      hashMatches: observedSha256 === replacement.sourceSha256,
      startSeconds: replacement.startSeconds,
      endSeconds: replacement.endSeconds,
    }));
  }

  assertSha256(handoff.voice?.sourceSha256, "voice.sourceSha256");
  const voicePath = resolvePath(handoff.voice.sourceFilename);
  const observedVoiceSha256 = await sha256File(voicePath);
  inputs.push(Object.freeze({
    kind: "audio",
    localPath: voicePath,
    expectedSha256: handoff.voice.sourceSha256,
    observedSha256: observedVoiceSha256,
    hashMatches: observedVoiceSha256 === handoff.voice.sourceSha256,
    approved: handoff.voice.approved === true,
    ownedOrLicensed: handoff.voice.ownedOrLicensed === true,
  }));

  const blockers = [];
  if (inputs.some((input) => !input.hashMatches)) blockers.push("SOURCE_HASH_MISMATCH");
  if (handoff.voice.approved !== true) blockers.push("FINAL_VOICE_NOT_APPROVED");
  if (handoff.voice.ownedOrLicensed !== true) blockers.push("FINAL_VOICE_RIGHTS_NOT_CONFIRMED");

  const executionPlan = Object.freeze({
    outputFilename: handoff.outputFilename,
    replacementCount: handoff.replacements.length,
    replacements: handoff.replacements.map((item) => Object.freeze({
      shotId: item.shotId,
      input: resolvePath(item.sourceFilename),
      startSeconds: item.startSeconds,
      endSeconds: item.endSeconds,
    })),
    voiceInput: voicePath,
    requiresHumanReviewAfterRender: true,
  });

  return Object.freeze({
    schemaVersion: "toolradar.final-render-preflight.v1",
    handoffId: handoff.handoffId,
    projectId: handoff.projectId,
    checkedInputs: Object.freeze(inputs),
    blockers: Object.freeze(blockers),
    decision: blockers.length ? "BLOCKED" : "READY_FOR_RENDER_COMMAND",
    renderCommandGenerationAllowed: blockers.length === 0,
    renderExecutionPerformed: false,
    publicationAllowed: false,
    executionPlan,
    nextAction: blockers.length ? "REPLACE_OR_REAPPROVE_INPUTS" : "GENERATE_AND_REVIEW_RENDER_COMMAND",
  });
}

export function validateFinalRenderPreflight(receipt) {
  if (receipt?.schemaVersion !== "toolradar.final-render-preflight.v1") throw new TypeError("unsupported preflight receipt");
  if (receipt.renderExecutionPerformed !== false) throw new TypeError("preflight cannot claim render execution");
  if (receipt.publicationAllowed !== false) throw new TypeError("preflight cannot authorize publication");
  if (receipt.renderCommandGenerationAllowed && receipt.blockers.length) {
    throw new TypeError("ready preflight cannot contain blockers");
  }
  if (receipt.executionPlan?.requiresHumanReviewAfterRender !== true) {
    throw new TypeError("post-render human review is required");
  }
  return true;
}
