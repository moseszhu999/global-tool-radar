const SAFE_TOKEN = /^[A-Za-z0-9._/\-]+$/;

function assertSafeToken(value, label) {
  if (typeof value !== "string" || !value || !SAFE_TOKEN.test(value)) {
    throw new TypeError(`${label} must be a non-empty safe path token`);
  }
}

function quote(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("command argument must be a non-empty string");
  }
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function buildRenderCommandManifest({ preflight, ffmpegBinary = "ffmpeg" }) {
  if (preflight?.schemaVersion !== "toolradar.final-render-preflight.v1") {
    throw new TypeError("supported final render preflight is required");
  }
  if (preflight.decision !== "READY_FOR_RENDER_COMMAND" || preflight.renderCommandGenerationAllowed !== true) {
    throw new TypeError("render-command-ready preflight is required");
  }
  if (preflight.blockers?.length) throw new TypeError("ready preflight cannot contain blockers");
  if (preflight.renderExecutionPerformed !== false || preflight.publicationAllowed !== false) {
    throw new TypeError("preflight truth boundary is invalid");
  }
  if (preflight.executionPlan?.requiresHumanReviewAfterRender !== true) {
    throw new TypeError("post-render human review is required");
  }

  assertSafeToken(ffmpegBinary, "ffmpegBinary");
  assertSafeToken(preflight.executionPlan.outputFilename, "outputFilename");
  assertSafeToken(preflight.executionPlan.voiceInput, "voiceInput");

  const replacements = preflight.executionPlan.replacements ?? [];
  if (replacements.length !== 3) throw new TypeError("exactly three replacement shots are required");

  const inputArgs = [];
  for (const replacement of replacements) {
    assertSafeToken(replacement.input, `${replacement.shotId}.input`);
    if (!Number.isFinite(replacement.startSeconds) || !Number.isFinite(replacement.endSeconds) || replacement.endSeconds <= replacement.startSeconds) {
      throw new TypeError(`${replacement.shotId} timeline range is invalid`);
    }
    inputArgs.push("-i", replacement.input);
  }
  inputArgs.push("-i", preflight.executionPlan.voiceInput);

  const commandArgs = [
    "-hide_banner",
    "-nostdin",
    "-y",
    ...inputArgs,
    "-map_metadata",
    "-1",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    preflight.executionPlan.outputFilename,
  ];

  const shellPreview = [ffmpegBinary, ...commandArgs].map(quote).join(" ");

  return Object.freeze({
    schemaVersion: "toolradar.render-command-manifest.v1",
    handoffId: preflight.handoffId,
    projectId: preflight.projectId,
    executable: ffmpegBinary,
    args: Object.freeze(commandArgs),
    shellPreview,
    inputCount: replacements.length + 1,
    outputFilename: preflight.executionPlan.outputFilename,
    sourceHashesVerifiedByPreflight: true,
    renderExecutionAllowed: true,
    renderExecutionPerformed: false,
    humanReviewRequiredAfterRender: true,
    publicationAllowed: false,
    nextAction: "HUMAN_REVIEW_COMMAND_THEN_EXECUTE_LOCALLY",
  });
}

export function validateRenderCommandManifest(manifest) {
  if (manifest?.schemaVersion !== "toolradar.render-command-manifest.v1") throw new TypeError("unsupported render command manifest");
  if (manifest.renderExecutionPerformed !== false) throw new TypeError("manifest cannot claim render execution");
  if (manifest.publicationAllowed !== false) throw new TypeError("manifest cannot authorize publication");
  if (manifest.humanReviewRequiredAfterRender !== true) throw new TypeError("post-render human review is required");
  if (manifest.renderExecutionAllowed !== true || manifest.sourceHashesVerifiedByPreflight !== true) {
    throw new TypeError("render command manifest must be based on verified inputs");
  }
  if (!Array.isArray(manifest.args) || manifest.args.length === 0) throw new TypeError("render args are required");
  return true;
}
