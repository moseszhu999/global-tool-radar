import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createHash } from "node:crypto";

import {
  buildFinalRenderPreflight,
  validateFinalRenderPreflight,
} from "../src/index.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "toolradar-render-preflight-"));
  const files = {
    prompt: join(directory, "prompt.mp4"),
    preview: join(directory, "preview.mp4"),
    result: join(directory, "result.mp4"),
    voice: join(directory, "voice.wav"),
  };
  await writeFile(files.prompt, "prompt-video");
  await writeFile(files.preview, "preview-video");
  await writeFile(files.result, "result-video");
  await writeFile(files.voice, "approved-voice");

  const handoff = {
    schemaVersion: "toolradar.final-render-handoff.v1",
    handoffId: "replit-design:final-render-handoff:v1",
    projectId: "replit-design",
    outputFilename: "replit-design-final.mp4",
    decision: "READY_FOR_FINAL_RENDER_EXECUTION",
    renderExecutionAllowed: true,
    humanReviewRequiredAfterRender: true,
    publicationAllowed: false,
    replacements: [
      { shotId: "replit_prompt_to_build", sourceFilename: "prompt.mp4", sourceSha256: sha256("prompt-video"), startSeconds: 2, endSeconds: 8 },
      { shotId: "replit_live_preview", sourceFilename: "preview.mp4", sourceSha256: sha256("preview-video"), startSeconds: 8, endSeconds: 14 },
      { shotId: "replit_iteration_result", sourceFilename: "result.mp4", sourceSha256: sha256("result-video"), startSeconds: 14, endSeconds: 20 },
    ],
    voice: {
      sourceFilename: "voice.wav",
      sourceSha256: sha256("approved-voice"),
      approved: true,
      ownedOrLicensed: true,
    },
  };

  return { directory, files, handoff };
}

test("produces a bounded ready receipt when all local hashes match", async () => {
  const { directory, handoff } = await fixture();
  const receipt = await buildFinalRenderPreflight({
    handoff,
    resolvePath: (filename) => join(directory, filename),
  });
  assert.equal(receipt.decision, "READY_FOR_RENDER_COMMAND");
  assert.equal(receipt.renderCommandGenerationAllowed, true);
  assert.equal(receipt.renderExecutionPerformed, false);
  assert.equal(receipt.publicationAllowed, false);
  assert.equal(receipt.checkedInputs.length, 4);
  assert.equal(receipt.checkedInputs.every((input) => input.hashMatches), true);
  assert.equal(validateFinalRenderPreflight(receipt), true);
});

test("blocks when a local source hash does not match the handoff", async () => {
  const { directory, files, handoff } = await fixture();
  await writeFile(files.preview, "tampered-preview");
  const receipt = await buildFinalRenderPreflight({
    handoff,
    resolvePath: (filename) => join(directory, filename),
  });
  assert.equal(receipt.decision, "BLOCKED");
  assert.deepEqual(receipt.blockers, ["SOURCE_HASH_MISMATCH"]);
  assert.equal(receipt.renderCommandGenerationAllowed, false);
});

test("rejects a handoff that is not render executable", async () => {
  const { directory, handoff } = await fixture();
  await assert.rejects(
    () => buildFinalRenderPreflight({
      handoff: { ...handoff, renderExecutionAllowed: false, decision: "BLOCKED" },
      resolvePath: (filename) => join(directory, filename),
    }),
    /render-executable handoff is required/,
  );
});

test("never allows preflight to claim render execution or publication", () => {
  assert.throws(
    () => validateFinalRenderPreflight({
      schemaVersion: "toolradar.final-render-preflight.v1",
      blockers: [],
      renderCommandGenerationAllowed: true,
      renderExecutionPerformed: true,
      publicationAllowed: false,
      executionPlan: { requiresHumanReviewAfterRender: true },
    }),
    /preflight cannot claim render execution/,
  );
  assert.throws(
    () => validateFinalRenderPreflight({
      schemaVersion: "toolradar.final-render-preflight.v1",
      blockers: [],
      renderCommandGenerationAllowed: true,
      renderExecutionPerformed: false,
      publicationAllowed: true,
      executionPlan: { requiresHumanReviewAfterRender: true },
    }),
    /preflight cannot authorize publication/,
  );
});
