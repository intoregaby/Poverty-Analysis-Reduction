// Builds the "External Evidence Verification" section from the engine's verification registry. Nothing here comes from an AI writer.

export const STATUS_LABEL = {
  verified_match: "Verified match", discrepancy_requires_review: "Discrepancy requiring review", not_externally_verified: "Not externally verified",
  methodology_mismatch: "Methodology mismatch", new_analytical_finding: "New analytical finding",
};

const unitOf = (unit = "") => (/^percentage points/.test(unit) ? " points" : /^percent/.test(unit) ? "%" : unit === "households" ? " households" : "");
export function formatValue(value, unit, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "Not available";
  const number = unit === "households" ? Number(value).toLocaleString("en-GB") : Number(value).toFixed(decimals);
  return `${number}${unitOf(unit)}`;
}

const decimalsOf = (value) => (String(value).split(".")[1] || "").length || 1;

const showsSpread = (entry) => entry.unit !== "households" && entry.unit !== "percentage points";

function officialText(entry) {
  if (entry.published_value === null || entry.published_value === undefined) return "No comparable published figure";
  const own = formatValue(entry.published_value, entry.unit, Math.max(decimalsOf(entry.published_value), 1));
  const spread = [];
  if (!showsSpread(entry)) return own;
  if (entry.published_standard_error != null) spread.push(`standard error ${entry.published_standard_error}`);
  if (entry.published_interval?.[0] != null) spread.push(`95% interval ${entry.published_interval[0]} to ${entry.published_interval[1]}`);
  return spread.length ? `${own} (${spread.join("; ")})` : own;
}

function sourceText(entry) {
  if (!entry.source_document) return "No source: not retrieved or not published";
  return [entry.source_document, entry.source_page_or_table, entry.retrieved_at ? `retrieved ${String(entry.retrieved_at).slice(0, 10)}` : null, entry.source_version ? `version ${entry.source_version}` : null].filter(Boolean).join(", ");
}

const names = (items) => items.map((item) => item.indicator).join("; ");

export function verificationSection(result, corrections = []) {
  const verification = result.verification;
  if (!verification || verification.status !== "Completed") {
    return {
      available: false, unresolved: 0, rows: [], corrections, counts: {}, lists: {}, sources: [], decomposition: null, limitations: verification?.limitations || [],
      headline: "No figure in this report was checked against official publications.",
      reason: verification?.reason || "This investigation was run before evidence verification was added. Run it again to check its figures.",
    };
  }
  const registry = verification.registry || [];
  const group = (status) => registry.filter((item) => item.verification_status === status);
  const verified = group("verified_match"), discrepancies = group("discrepancy_requires_review"), mismatches = group("methodology_mismatch"), unverified = group("not_externally_verified"), original = group("new_analytical_finding");
  const decomposition = verification.methods_review?.decomposition || null;
  const unresolved = verification.summary?.unresolved ?? discrepancies.length;
  const headline = `${verified.length} of ${registry.length} checked figures match NISR's published tables. ${discrepancies.length ? `${discrepancies.length} need review. ` : ""}${mismatches.length ? `${mismatches.length} cannot be compared directly because the definitions differ. ` : ""}${original.length + unverified.length} are the engine's own analyses or have no published figure to check against.`.trim();
  return {
    available: true, generated_at: verification.generated_at, headline, unresolved, unresolved_items: verification.summary?.unresolved_items || [],
    counts: verification.summary?.counts || {}, corrections,
    rows: registry.filter((item) => item.verification_status !== "new_analytical_finding").map((item) => ({
      indicator: item.indicator, internal: formatValue(item.internal_value, item.unit, item.unit === "percentage points" ? 2 : 1), official: officialText(item), source: sourceText(item), url: item.source_url || null,
      status: item.verification_status, label: STATUS_LABEL[item.verification_status], note: item.verification_notes, estimate_type: item.estimate_type,
    })),
    original: original.map((item) => ({ indicator: item.indicator, value: formatValue(item.internal_value, item.unit), note: item.verification_notes })),
    lists: {
      verified: names(verified), discrepancies: names(discrepancies), mismatches: names(mismatches), unverified: names(unverified), original: names(original),
    },
    decomposition: decomposition && { status: decomposition.status, checks: decomposition.checks, assumptions: decomposition.assumptions, reproduce: decomposition.reproduce },
    sources: (verification.sources || []).map((item) => ({ title: item.title, url: item.url, available: item.available, version: item.version, retrieved_at: item.retrieved_at, error: item.error })),
    limitations: verification.limitations || [], audit_trail: verification.audit_trail || [],
  };
}
