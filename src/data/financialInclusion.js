export const FINANCIAL_ACCESS_ORDER = [
  { key: "access_strand_banked", label: "Banked", color: "#635BFF" },
  { key: "access_strand_other_formal_nonbank", label: "Other formal (non-bank)", color: "#14B8A6" },
  { key: "access_strand_informal_only", label: "Informal only", color: "#F5A623" },
  { key: "access_strand_excluded", label: "Excluded", color: "#E3E8EE" },
];

export function mapFinancialAccessRows(rows = []) {
  const values = new Map(rows
    .filter((row) => row.geography_level === "national" && !row.segment)
    .map((row) => [row.indicator, row]));
  return FINANCIAL_ACCESS_ORDER.flatMap((category) => {
    const row = values.get(category.key);
    return row ? [{ ...category, value: Number(row.value), sourceId: row.source_id, tableReference: row.table_reference, methodology: row.methodology, periodEnd: row.period_end, population: row.population, denominator: row.denominator }] : [];
  });
}

// A newly approved source can replace the displayed national Access Strand only
// when it supplies the complete, mutually exclusive national set. Other uploads
// (for example BNR provider aggregates) cannot silently replace this survey chart.
export function selectCompleteNationalAccessStrand(observations = []) {
  const bySource = new Map();
  for (const row of observations) {
    if (row.geography_level !== "national" || row.segment) continue;
    const rows = bySource.get(row.source_id) || [];
    rows.push(row);
    bySource.set(row.source_id, rows);
  }
  const required = new Set([...FINANCIAL_ACCESS_ORDER.map((item) => item.key), "overall_inclusion_access_strand"]);
  const candidates = [...bySource.entries()].map(([sourceId, rows]) => ({ sourceId, rows, periodEnd: rows.map((row) => row.period_end || "").sort().at(-1) || "" }))
    .filter((candidate) => required.isSubsetOf(new Set(candidate.rows.map((row) => row.indicator))))
    .sort((left, right) => right.periodEnd.localeCompare(left.periodEnd));
  return candidates[0] || null;
}

export function countObservationsBySource(observations = []) {
  return observations.reduce((counts, row) => {
    counts[row.source_id] = (counts[row.source_id] || 0) + 1;
    return counts;
  }, {});
}
