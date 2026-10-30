import test from "node:test";
import assert from "node:assert/strict";

import { DENIED, RESTRICTED_DRAFT, WATERMARK, exportBanner, exportDecision, requireExportable } from "./exportPolicy.js";

const verified = () => ({
  available: true, unresolved: 0, unresolved_items: [],
  sources: [{ id: "eicv7-poverty", available: true }, { id: "eicv7-consumption", available: true }],
});

test("a missing verification record is refused instead of exported unlabelled", () => {
  const decision = exportDecision({ title: "Kamonyi" });
  assert.equal(decision.mode, DENIED);
  assert.equal(decision.code, "NO_VERIFICATION");
  assert.throws(() => requireExportable(decision), /verification record/i);
});

test("no report at all is refused", () => {
  assert.equal(exportDecision(null).mode, DENIED);
  assert.equal(exportDecision(null).code, "NO_REPORT");
});

test("browser exports are always restricted drafts, never public releases", () => {
  const decision = exportDecision({ verification: verified() });
  assert.equal(decision.mode, RESTRICTED_DRAFT);
  assert.equal(decision.watermark, WATERMARK);
  assert.equal(decision.manifest.released_by_server, false);
  assert.deepEqual(decision.blockers, []);
});

test("unresolved figures and failed official sources are listed as blockers", () => {
  const verification = verified();
  verification.unresolved = 2;
  verification.unresolved_items = ["poverty_headcount", "decomposition"];
  verification.sources = [{ id: "eicv7-poverty", available: false }, { id: "finscope", available: true }];
  const decision = exportDecision({ verification });
  assert.deepEqual(decision.blockers.sort(), ["official_sources_unavailable", "unresolved_evidence_issues"]);
  assert.deepEqual(decision.manifest.official_sources_unavailable, ["eicv7-poverty"]);
  const banner = exportBanner(decision);
  assert.match(banner, /DRAFT - NOT OFFICIAL/);
  assert.match(banner, /eicv7-poverty/);
  assert.match(banner, /poverty_headcount/);
});

test("an unavailable verification run and automated fallback are both surfaced", () => {
  const decision = exportDecision({
    automated: true,
    verification: { available: false, reason: "This investigation was run before evidence verification was added." },
  });
  assert.equal(decision.mode, RESTRICTED_DRAFT);
  assert.deepEqual(decision.blockers.sort(), ["automated_fallback_narrative", "verification_incomplete"]);
  assert.match(exportBanner(decision), /Checks not passed/);
});
