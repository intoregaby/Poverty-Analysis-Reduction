// Export policy for the legacy browser report downloads.
//
// The governed API is the only place that can release a report (see engine/ireme/reports.py).
// This local page has no server release authority, so every download it produces is a
// RESTRICTED DRAFT: it must carry a visible watermark and a machine-readable manifest of the
// checks that did not pass. Nothing here can promote a report to "public"; a missing report or a
// missing verification record is refused outright instead of being exported unlabelled.

export const RESTRICTED_DRAFT = "restricted_draft";
export const DENIED = "denied";

export const WATERMARK = "DRAFT - NOT OFFICIAL - NOT RELEASED FOR PUBLICATION";

const asArray = (value) => (Array.isArray(value) ? value : []);

/**
 * Build the export decision for one report.
 * @param {{verification?: object}} report report object rendered in the UI
 * @returns {{mode: string, code?: string, reason?: string, watermark?: string, blockers: string[], manifest: object}}
 */
export function exportDecision(report) {
  if (!report || typeof report !== "object") {
    return { mode: DENIED, code: "NO_REPORT", reason: "There is no report to export.", blockers: [], manifest: {} };
  }
  const verification = report.verification;
  if (!verification || typeof verification !== "object") {
    return {
      mode: DENIED,
      code: "NO_VERIFICATION",
      reason: "This report has no verification record, so it cannot be labelled or exported.",
      blockers: [],
      manifest: {},
    };
  }
  const sources = asArray(verification.sources);
  const failedSources = sources.filter((item) => item && item.available === false);
  const unresolved = Number(verification.unresolved) || 0;
  const automated = Boolean(report.automated);
  const blockers = [];
  if (!verification.available) blockers.push("verification_incomplete");
  if (unresolved > 0) blockers.push("unresolved_evidence_issues");
  if (failedSources.length) blockers.push("official_sources_unavailable");
  if (automated) blockers.push("automated_fallback_narrative");
  return {
    mode: RESTRICTED_DRAFT,
    watermark: WATERMARK,
    blockers,
    manifest: {
      verification_available: Boolean(verification.available),
      unresolved,
      unresolved_items: asArray(verification.unresolved_items),
      official_sources: sources.length,
      official_sources_unavailable: failedSources.map((item) => item.id || item.title || "unknown"),
      automated_narrative: automated,
      released_by_server: false,
    },
  };
}

/** Throws instead of silently exporting when the decision refuses the download. */
export function requireExportable(decision) {
  if (!decision || decision.mode !== RESTRICTED_DRAFT) {
    const reason = decision?.reason || "This report cannot be exported.";
    const error = new Error(reason);
    error.code = decision?.code || "EXPORT_DENIED";
    throw error;
  }
  return decision;
}

/** Plain-text banner + failure manifest used by every format. */
export function exportBanner(decision) {
  requireExportable(decision);
  const m = decision.manifest;
  const lines = [
    `> **${decision.watermark}**`,
    ">",
    "> This file is an analyst working draft. It was produced in the browser without a server-side release decision, so it must not be published, quoted as official, or used for decisions.",
  ];
  if (decision.blockers.length) {
    lines.push(">", `> **Checks not passed:** ${decision.blockers.join(", ")}.`);
    if (m.official_sources_unavailable?.length) {
      lines.push(`> Official documents that could not be retrieved: ${m.official_sources_unavailable.join(", ")}.`);
    }
    if (m.unresolved_items?.length) {
      lines.push(`> Items requiring review: ${m.unresolved_items.join(", ")}.`);
    }
  }
  return lines.join("\n");
}
