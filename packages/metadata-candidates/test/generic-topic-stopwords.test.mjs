import assert from "node:assert/strict";
import test from "node:test";
import { extractTopicTokens } from "../src/index.mjs";

test("generic conversational words cannot fabricate cross-channel topics", () => {
  assert.deepEqual(
    extractTopicTokens(
      "Stop choosing the first AI avatar you see. Here's what actually matters",
    ),
    ["actually", "avatar", "see"],
  );
  assert.deepEqual(
    extractTopicTokens("Why OpenClaw feels like the Linux of AI"),
    ["linux", "openclaw"],
  );
});

test("domain-bearing tokens remain observable", () => {
  assert.deepEqual(
    extractTopicTokens("Replit Design and GitHub Copilot voice prompting"),
    ["copilot", "design", "github", "prompting", "replit", "voice"],
  );
});
