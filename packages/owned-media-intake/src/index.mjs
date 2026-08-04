const REQUIRED_SHOTS = Object.freeze([
  "replit_prompt_to_build",
  "replit_live_preview",
  "replit_iteration_result",
]);

function validSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function validIso(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function buildOwnedMediaIntakeReceipt({
  projectId,
  clips,
  voice,
  owner,
  capturedAt = new Date().toISOString(),
}) {
  if (!projectId?.trim()) throw new TypeError("projectId is required");
  if (!owner?.trim()) throw new TypeError("owner is required");
  if (!validIso(capturedAt)) throw new TypeError("capturedAt must be ISO-8601");
  if (!Array.isArray(clips)) throw new TypeError("clips are required");

  const normalizedClips = REQUIRED_SHOTS.map((shotId) => {
    const clip = clips.find((item) => item?.shotId === shotId);
    const valid = Boolean(
      clip &&
      clip.ownedBySubmitter === true &&
      validSha256(clip.sha256) &&
      Number.isFinite(clip.durationSeconds) &&
      clip.durationSeconds > 0 &&
      typeof clip.localFilename === "string" &&
      clip.localFilename.trim()
    );
    return Object.freeze({
      shotId,
      present: Boolean(clip),
      valid,
      localFilename: clip?.localFilename?.trim() ?? null,
      sha256: clip?.sha256 ?? null,
      durationSeconds: clip?.durationSeconds ?? null,
      ownedBySubmitter: clip?.ownedBySubmitter === true,
    });
  });

  const voiceValid = Boolean(
    voice &&
    voice.approved === true &&
    voice.ownedOrLicensed === true &&
    validSha256(voice.sha256) &&
    typeof voice.localFilename === "string" &&
    voice.localFilename.trim()
  );

  const missingShotIds = normalizedClips.filter((clip) => !clip.valid).map((clip) => clip.shotId);
  const blockers = Object.freeze([
    ...(missingShotIds.length ? ["OWNED_SCREEN_RECORDINGS_REQUIRED"] : []),
    ...(!voiceValid ? ["FINAL_VOICE_APPROVAL_REQUIRED"] : []),
  ]);

  return Object.freeze({
    schemaVersion: "toolradar.owned-media-intake-receipt.v1",
    receiptId: `${projectId.trim()}:owned-media-intake:v1`,
    projectId: projectId.trim(),
    capturedAt,
    owner: owner.trim(),
    clips: Object.freeze(normalizedClips),
    voice: Object.freeze({
      present: Boolean(voice),
      valid: voiceValid,
      approved: voice?.approved === true,
      ownedOrLicensed: voice?.ownedOrLicensed === true,
      localFilename: voice?.localFilename?.trim() ?? null,
      sha256: voice?.sha256 ?? null,
    }),
    missingShotIds: Object.freeze(missingShotIds),
    blockers,
    decision: blockers.length === 0 ? "READY_FOR_FINAL_RENDER" : "BLOCKED",
    finalRenderAllowed: blockers.length === 0,
    publicationAllowed: false,
    nextAction: blockers.length === 0 ? "RENDER_FINAL_MEDIA" : "SUPPLY_OWNED_MEDIA",
  });
}

export function validateOwnedMediaIntakeReceipt(receipt) {
  if (receipt?.schemaVersion !== "toolradar.owned-media-intake-receipt.v1") throw new TypeError("unsupported receipt");
  if (!Array.isArray(receipt.clips) || receipt.clips.length !== REQUIRED_SHOTS.length) throw new TypeError("complete shot set is required");
  if (receipt.publicationAllowed !== false) throw new TypeError("media intake cannot authorize publication");
  if (receipt.finalRenderAllowed && receipt.blockers.length) throw new TypeError("render-ready receipt cannot contain blockers");
  if (receipt.finalRenderAllowed && receipt.decision !== "READY_FOR_FINAL_RENDER") throw new TypeError("render permission requires ready decision");
  return true;
}

export { REQUIRED_SHOTS };
