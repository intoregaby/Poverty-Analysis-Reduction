import test from "node:test";
import assert from "node:assert/strict";
import { countObservationsBySource, mapFinancialAccessRows } from "./financialInclusion.js";

const rows = [
  { indicator: "access_strand_excluded", value: 4, source_id: "fin", geography_level: "national", segment: null, table_reference: "p.27", methodology: "survey", period_end: "2024-12-31", population: "Adults 16+", denominator: "Adults", },
  { indicator: "access_strand_banked", value: 22, source_id: "fin", geography_level: "national", segment: null, table_reference: "p.27", methodology: "survey", period_end: "2024-12-31", population: "Adults 16+", denominator: "Adults", },
  { indicator: "access_strand_other_formal_nonbank", value: 70, source_id: "fin", geography_level: "national", segment: null, table_reference: "p.27", methodology: "survey", period_end: "2024-12-31", population: "Adults 16+", denominator: "Adults", },
  { indicator: "access_strand_informal_only", value: 4, source_id: "fin", geography_level: "national", segment: null, table_reference: "p.27", methodology: "survey", period_end: "2024-12-31", population: "Adults 16+", denominator: "Adults", },
  { indicator: "access_strand_banked", value: 17, source_id: "fin", geography_level: "national", segment: "Female", table_reference: "p.27", methodology: "survey", period_end: "2024-12-31", population: "Female adults", denominator: "Female adults", },
  { indicator: "access_strand_banked", value: 20, source_id: "fin", geography_level: "district", segment: null, table_reference: "p.27", methodology: "survey", period_end: "2024-12-31", population: "Adults", denominator: "Adults", },
];

test("national pie categories map in display order and exclude segments/geographies", () => {
  const result = mapFinancialAccessRows(rows);
  assert.deepEqual(result.map((row) => row.key), [
    "access_strand_banked", "access_strand_other_formal_nonbank", "access_strand_informal_only", "access_strand_excluded",
  ]);
  assert.deepEqual(result.map((row) => row.value), [22, 70, 4, 4]);
  assert.equal(result.reduce((sum, row) => sum + row.value, 0), 100);
  assert.equal(result[0].tableReference, "p.27");
});

test("source counts are derived from loaded observation rows", () => {
  assert.deepEqual(countObservationsBySource([{ source_id: "fin" }, { source_id: "fin" }, { source_id: "roadmap" }]), { fin: 2, roadmap: 1 });
});
