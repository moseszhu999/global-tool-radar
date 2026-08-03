const TOOL_STATUSES = Object.freeze(["candidate", "confirmed", "rejected", "merged"]);

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

export function normalizeOfficialDomain(value) {
  assertNonEmptyString(value, "officialDomain");
  const candidate = value.includes("://") ? value : `https://${value}`;
  const url = new URL(candidate);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new TypeError("officialDomain must use http or https");
  }
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

export function createToolEntity(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("tool entity input must be an object");
  }
  assertNonEmptyString(input.id, "id");
  assertNonEmptyString(input.canonicalName, "canonicalName");
  if (!TOOL_STATUSES.includes(input.status)) {
    throw new TypeError(`status must be one of: ${TOOL_STATUSES.join(", ")}`);
  }

  return Object.freeze({
    id: input.id.trim(),
    canonicalName: input.canonicalName.trim(),
    officialDomain: normalizeOfficialDomain(input.officialDomain),
    status: input.status,
  });
}

function normalizeName(value) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9]+/g, "");
}

export function proposeEntityLink(tool, sourceIdentity) {
  const entity = createToolEntity(tool);
  if (!sourceIdentity || typeof sourceIdentity !== "object") {
    throw new TypeError("sourceIdentity must be an object");
  }

  const evidence = [];
  if (sourceIdentity.officialDomain) {
    const domain = normalizeOfficialDomain(sourceIdentity.officialDomain);
    if (domain === entity.officialDomain) {
      evidence.push({
        method: "same_official_domain",
        confidence: 1,
        authority: "deterministic",
      });
    }
  }

  if (sourceIdentity.productHuntOfficialDomain) {
    const domain = normalizeOfficialDomain(sourceIdentity.productHuntOfficialDomain);
    if (domain === entity.officialDomain) {
      evidence.push({
        method: "same_product_hunt_domain",
        confidence: 0.98,
        authority: "deterministic",
      });
    }
  }

  const linkedDomains = Array.isArray(sourceIdentity.explicitOfficialLinks)
    ? sourceIdentity.explicitOfficialLinks.map(normalizeOfficialDomain)
    : [];
  if (linkedDomains.includes(entity.officialDomain)) {
    evidence.push({
      method: "explicit_official_link",
      confidence: 0.98,
      authority: "deterministic",
    });
  }

  if (evidence.length > 0) {
    return Object.freeze({
      toolId: entity.id,
      decision: "confirmed",
      autoMergeAllowed: true,
      evidence: Object.freeze(evidence),
    });
  }

  if (
    typeof sourceIdentity.name === "string" &&
    normalizeName(sourceIdentity.name) === normalizeName(entity.canonicalName)
  ) {
    return Object.freeze({
      toolId: entity.id,
      decision: "candidate",
      autoMergeAllowed: false,
      evidence: Object.freeze([
        {
          method: "normalized_name_match",
          confidence: 0.6,
          authority: "candidate_only",
        },
      ]),
    });
  }

  return Object.freeze({
    toolId: entity.id,
    decision: "no_match",
    autoMergeAllowed: false,
    evidence: Object.freeze([]),
  });
}
