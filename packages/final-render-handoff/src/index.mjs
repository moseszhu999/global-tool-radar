const REQUIRED_SHOTS = Object.freeze([
  "replit_prompt_to_build",
  "replit_live_preview",
  "replit_iteration_result",
]);

function validSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function buildFinalRenderHandoff({ intakeReceipt, timelineSlots, outputFilename }) {
  if (intakeReceipt?.schemaVersion !== "toolradar.owned-media-intake-receipt.v1") {
    throw new TypeError("supported owned-media intake receipt is required");
  }
  if (intakeReceipt.publicationAllowed !== false) {
    throw new TypeError("intake receipt cannot authorize publication");
  }
  if (intakeReceipt.finalRenderAllowed !== true || intakeReceipt.decision !== "READY_FOR_FINAL_RENDER") {
    throw new TypeError("render-ready intake receipt is required");
  }
  if (!Array.isArray(timelineSlots)) throw new TypeError("timelineSlots are required");
  if (!outputFilename?.trim()) throw new TypeError("outputFilename is required");

  const replacements = REQUIRED_SHOTS.map((shotId) => {
    const clip = intakeReceipt.clips.find((item) => item?.shotId === shotId);
    const slot = timelineSlots.find((item) => item?.shotId === shotId);
    if (!clip?.valid || !validSha256(clip.sha256)) throw new TypeError(`invalid clip: ${shotId}`);
    if (!slot || !Number.isFinite(slot.startSeconds) || !Number.isFinite(slot.endSeconds) || slot.endSeconds <= slot.startSeconds) {
      throw new TypeError(`invalid timeline slot: ${shotId}`);
    }
    return Object.freeze({
      shotId,
      sourceFilename: clip.localFilename,
      sourceSha256: clip.sha256,
      sourceDurationSeconds: clip.durationSeconds,
      startSeconds: slot.startSeconds,
      endSeconds: slot.endSeconds,
      replacementDurationSeconds: Number((slot.endSeconds - slot.startSeconds).toFixed(3)),
    });
  });

  const blockers = [];
  if (!intakeReceipt.voice?.valid || !validSha256(intakeReceipt.voice.sha256)) blockers.push("FINAL_VOICE_REQUIRED");

  return Object.freeze({
    schemaVersion: "toolradar.final-render-handoff.v1",
    handoffId: `${intakeReceipt.projectId}:final-render-handoff:v1`,
    projectId: intakeReceipt.projectId,
    sourceReceiptId: intakeReceipt.receiptId,
    sourceReceiptCapturedAt: intakeReceipt.capturedAt,
    outputFilename: outputFilename.trim(),
    replacements: Object.freeze(replacements),
    voice: Object.freeze({
      sourceFilename: intakeReceipt.voice.localFilename,
      sourceSha256: intakeReceipt.voice.sha256,
      approved: intakeReceipt.voice.approved === true,
      ownedOrLicensed: intakeReceipt.voice.ownedOrLicensed === true,
    }),
    blockers: Object.freeze(blockers),
    decision: blockers.length ? "BLOCKED" : "READY_FOR_FINAL_RENDER_EXECUTION",
    renderExecutionAllowed: blockers.length === 0,
    humanReviewRequiredAfterRender: true,
    publicationAllowed: false,
    nextAction: blockers.length ? "RESOLVE_RENDER_INPUTS" : "EXECUTE_FINAL_RENDER",
  });
}

export function validateFinalRenderHandoff(handoff) {
  if (handoff?.schemaVersion !== "toolradar.final-render-handoff.v1") throw new TypeError("unsupported handoff");
  if (!Array.isArray(handoff.replacements) || handoff.replacements.length !== REQUIRED_SHOTS.length) {
    throw new TypeError("complete replacement set is required");
  }
  if (handoff.publicationAllowed !== false) throw new TypeError("render handoff cannot authorize publication");
  if (handoff.humanReviewRequiredAfterRender !== true) throw new TypeError("post-render human review is required");
  if (handoff.renderExecutionAllowed && handoff.blockers.length) throw new TypeError("executable handoff cannot contain blockers");
  return true;
}

export { REQUIRED_SHOTS };
