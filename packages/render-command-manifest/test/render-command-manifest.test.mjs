import test from "node:test";
import assert from "node:assert/strict";
import { buildRenderCommandManifest, validateRenderCommandManifest } from "../src/index.mjs";

function readyPreflight() {
  return {
    schemaVersion: "toolradar.final-render-preflight.v1",
    handoffId: "handoff-1",
    projectId: "toolradar-video-1",
    blockers: [],
    decision: "READY_FOR_RENDER_COMMAND",
    renderCommandGenerationAllowed: true,
    renderExecutionPerformed: false,
    publicationAllowed: false,
    executionPlan: {
      outputFilename: "toolradar-final.mp4",
      voiceInput: "voice-final.wav",
      requiresHumanReviewAfterRender: true,
      replacements: [
        { shotId: "replit_prompt_to_build", input: "prompt.mp4", startSeconds: 4, endSeconds: 9 },
        { shotId: "replit_live_preview", input: "preview.mp4", startSeconds: 10, endSeconds: 16 },
        { shotId: "replit_iteration_result", input: "iteration.mp4", startSeconds: 17, endSeconds: 24 },
      ],
    },
  };
}

test("builds a bounded ffmpeg command manifest from verified preflight", () => {
  const manifest = buildRenderCommandManifest({ preflight: readyPreflight() });
  assert.equal(manifest.schemaVersion, "toolradar.render-command-manifest.v1");
  assert.equal(manifest.inputCount, 4);
  assert.equal(manifest.renderExecutionAllowed, true);
  assert.equal(manifest.renderExecutionPerformed, false);
  assert.equal(manifest.publicationAllowed, false);
  assert.match(manifest.shellPreview, /ffmpeg/);
  assert.equal(validateRenderCommandManifest(manifest), true);
});

test("rejects blocked preflight", () => {
  const preflight = readyPreflight();
  preflight.decision = "BLOCKED";
  preflight.renderCommandGenerationAllowed = false;
  preflight.blockers = ["SOURCE_HASH_MISMATCH"];
  assert.throws(() => buildRenderCommandManifest({ preflight }), /render-command-ready preflight/);
});

test("rejects incomplete replacement set", () => {
  const preflight = readyPreflight();
  preflight.executionPlan.replacements.pop();
  assert.throws(() => buildRenderCommandManifest({ preflight }), /exactly three replacement shots/);
});

test("manifest never claims execution or publication", () => {
  const manifest = { ...buildRenderCommandManifest({ preflight: readyPreflight() }), renderExecutionPerformed: true };
  assert.throws(() => validateRenderCommandManifest(manifest), /cannot claim render execution/);

  const published = { ...buildRenderCommandManifest({ preflight: readyPreflight() }), publicationAllowed: true };
  assert.throws(() => validateRenderCommandManifest(published), /cannot authorize publication/);
});
