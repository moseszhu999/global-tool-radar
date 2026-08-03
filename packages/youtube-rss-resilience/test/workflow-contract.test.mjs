import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("scheduled captures remain strict while pull-request live checks are diagnostic", () => {
  const workflow = readFileSync(
    new URL("../../../.github/workflows/youtube-rss-pilot.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /TOOLRADAR_RSS_MINIMUM_SUCCESS_RATIO: "0\.8"/);

  const diagnosticStart = workflow.indexOf(
    "Diagnose public YouTube capture without secrets",
  );
  const productionStart = workflow.indexOf(
    "Capture public YouTube evidence with optional API fallback",
  );
  const uploadStart = workflow.indexOf("Upload public capture evidence");
  assert.ok(diagnosticStart >= 0);
  assert.ok(productionStart > diagnosticStart);
  assert.ok(uploadStart > productionStart);

  const diagnostic = workflow.slice(diagnosticStart, productionStart);
  const production = workflow.slice(productionStart, uploadStart);
  assert.match(diagnostic, /if: github\.event_name == 'pull_request'/);
  assert.match(diagnostic, /continue-on-error: true/);
  assert.match(production, /if: github\.event_name != 'pull_request'/);
  assert.doesNotMatch(production, /continue-on-error/);
  assert.match(
    workflow,
    /steps\.capture_pr\.outcome == 'success' \|\| steps\.capture_production\.outcome == 'success'/,
  );
});
