import assert from "node:assert/strict";
import test from "node:test";
import {
  createToolEntity,
  normalizeOfficialDomain,
  proposeEntityLink,
} from "../src/index.mjs";

const tool = {
  id: "tool-1",
  canonicalName: "Example Agent",
  officialDomain: "https://www.example.ai/",
  status: "confirmed",
};

test("official domains normalize without protocol, www, path, or case", () => {
  assert.equal(normalizeOfficialDomain("HTTPS://WWW.Example.AI/pricing"), "example.ai");
});

test("matching official domain can confirm a source link", () => {
  const result = proposeEntityLink(tool, { officialDomain: "example.ai" });
  assert.equal(result.decision, "confirmed");
  assert.equal(result.autoMergeAllowed, true);
  assert.equal(result.evidence[0].method, "same_official_domain");
});

test("name-only matches never auto-merge entities", () => {
  const result = proposeEntityLink(tool, { name: "Example Agent" });
  assert.equal(result.decision, "candidate");
  assert.equal(result.autoMergeAllowed, false);
});

test("a closed-source tool can exist without a GitHub identity", () => {
  const entity = createToolEntity(tool);
  assert.equal(entity.officialDomain, "example.ai");
  assert.equal("githubRepo" in entity, false);
});
