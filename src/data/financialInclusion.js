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

export function countObservationsBySource(observations = []) {
  return observations.reduce((counts, row) => {
    counts[row.source_id] = (counts[row.source_id] || 0) + 1;
    return counts;
  }, {});
}
