import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOwnedMediaIntakeReceipt,
  validateOwnedMediaIntakeReceipt,
  REQUIRED_SHOTS,
} from "../src/index.mjs";

const clips = REQUIRED_SHOTS.map((shotId, index) => ({
  shotId,
  localFilename: `clip-${index + 1}.mp4`,
  sha256: String(index + 1).repeat(64),
  durationSeconds: 8 + index,
  ownedBySubmitter: true,
}));

const voice = {
  localFilename: "final-voice.wav",
  sha256: "a".repeat(64),
  approved: true,
  ownedOrLicensed: true,
};

test("allows final render only when all three owned clips and approved voice are present", () => {
  const receipt = buildOwnedMediaIntakeReceipt({
    projectId: "replit-design",
    clips,
    voice,
    owner: "Aaron",
    capturedAt: "2026-08-05T05:00:00.000Z",
  });
  assert.equal(receipt.decision, "READY_FOR_FINAL_RENDER");
  assert.equal(receipt.finalRenderAllowed, true);
  assert.equal(receipt.publicationAllowed, false);
  assert.equal(validateOwnedMediaIntakeReceipt(receipt), true);
});

test("missing one recording preserves the real M9 blocker", () => {
  const receipt = buildOwnedMediaIntakeReceipt({
    projectId: "replit-design",
    clips: clips.slice(0, 2),
    voice,
    owner: "Aaron",
  });
  assert.equal(receipt.finalRenderAllowed, false);
  assert.deepEqual(receipt.missingShotIds, ["replit_iteration_result"]);
  assert.deepEqual(receipt.blockers, ["OWNED_SCREEN_RECORDINGS_REQUIRED"]);
});

test("unapproved or unlicensed voice cannot be treated as final", () => {
  const receipt = buildOwnedMediaIntakeReceipt({
    projectId: "replit-design",
    clips,
    voice: { ...voice, approved: false },
    owner: "Aaron",
  });
  assert.equal(receipt.finalRenderAllowed, false);
  assert.deepEqual(receipt.blockers, ["FINAL_VOICE_APPROVAL_REQUIRED"]);
});

test("intake receipt can never authorize publication", () => {
  const receipt = buildOwnedMediaIntakeReceipt({ projectId: "replit-design", clips, voice, owner: "Aaron" });
  assert.throws(() => validateOwnedMediaIntakeReceipt({ ...receipt, publicationAllowed: true }), /cannot authorize publication/);
});
