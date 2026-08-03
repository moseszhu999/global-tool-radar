import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("scheduled captures remain strict while pull-request live checks are diagnostic", () => {
  const workflow = readFileSync(
    new URL("../../../.github/workflows/youtube-rss-pilot.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /TOOLRADAR_RSS_MINIMUM_SUCCESS_RATIO: "0\.8"/);
  assert.match(
    workflow,
    /continue-on-error: \$\{\{ github\.event_name == 'pull_request' \}\}/,
  );
  assert.match(workflow, /if: steps\.capture\.outcome == 'success'/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});
