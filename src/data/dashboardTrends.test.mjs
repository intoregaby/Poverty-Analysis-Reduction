import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const data = JSON.parse(readFileSync(new URL("./dashboard-trends.json", import.meta.url), "utf8"));
const LABELS = /^(Clear improvement|Clear worsening|Possible improvement|Possible worsening|No clear change)/;

test("all 30 districts appear once in every trend and access table", () => {
  for (const rows of [data.districts, data.access.districts]) {
    assert.equal(rows.length, 30);
    assert.equal(new Set(rows.map((row) => row.name)).size, 30);
  }
});

test("published district strands add up to about 100 and are whole numbers", () => {
  for (const row of data.access.districts) {
    const { banked, otherFormal, informalOnly, excluded } = row.published;
    const total = banked + otherFormal + informalOnly + excluded;
    assert.ok(total >= 98 && total <= 102, `${row.name} totals ${total}`);
    assert.ok(row.sampleAdults >= 399 && row.sampleAdults <= 848);
  }
});

test("changes have ordered intervals, a valid label and a point estimate inside the interval", () => {
  for (const row of data.districts) {
    for (const change of Object.values(row.changes)) {
      if (!change) continue;
      assert.ok(change.ci_lower <= change.points && change.points <= change.ci_upper, row.name);
      assert.match(change.label, LABELS);
      assert.ok(change.holm_adjusted_p >= 0 && change.holm_adjusted_p <= 1);
      if (change.label.startsWith("Clear")) assert.ok(change.ci_lower > 0 || change.ci_upper < 0, `${row.name} clear change must exclude zero`);
    }
  }
});

test("change counts match the district labels", () => {
  for (const [period, counts] of Object.entries(data.changeCounts)) {
    const labels = data.districts.map((row) => row.changes[period]?.label ?? "");
    assert.equal(counts.clearImprovement, labels.filter((label) => label === "Clear improvement").length);
    assert.equal(counts.clearWorsening, labels.filter((label) => label === "Clear worsening").length);
  }
});

test("panel shares sum to 100 overall and by province, and national figures match NISR", () => {
  const sum = (shares) => Object.values(shares).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum(data.panel.shares) - 100) < 0.5);
  for (const province of data.panel.byProvince) assert.ok(Math.abs(sum(province.shares) - 100) < 0.5, province.province);
  assert.deepEqual(data.panel.byProvince.map((item) => item.province).sort(), ["Eastern", "Kigali City", "Northern", "Southern", "Western"]);
  assert.equal(data.national.eicv7, 27.4);
  assert.equal(data.national.modelled2016_17, 39.8);
  for (const check of data.national.checks) if (check.round !== "EICV3") assert.ok(check.matches, check.round);
});

test("the FinScope 2020 to 2024 trend covers all 30 districts and reconciles with NISR", () => {
  const trend = data.finscopeTrend;
  assert.equal(trend.districts.length, 30);
  assert.equal(new Set(trend.districts.map((row) => row.name)).size, 30);
  assert.ok(trend.checks.length >= 6);
  for (const check of trend.checks) assert.ok(check.ok, `${check.measure} must match NISR's published figure`);
  const sum = (shares) => Object.values(shares).reduce((a, b) => a + b, 0);
  assert.equal(sum({ ...trend.national.y2020Restated, formal: 0 }), 100);
  assert.equal(sum({ ...trend.national.y2024, formal: 0 }), 100);
  assert.equal(trend.national.y2020Restated.formal, trend.national.y2020Restated.banked + trend.national.y2020Restated.other_formal);
  assert.ok(Math.abs(trend.national.y2020Microdata.formal - 77) <= 1);
});

test("FinScope changes have valid labels, ordered intervals and match their counts", () => {
  const trend = data.finscopeTrend;
  const LABEL = /^(Clear|Possible) (rise|fall)|^No clear change/;
  for (const measure of ["excluded", "informal_only", "formal", "mobile_money"]) {
    const labels = trend.districts.map((row) => row[measure].change?.label ?? "");
    for (const row of trend.districts) {
      const change = row[measure].change;
      if (!change) continue;
      assert.match(change.label, LABEL, `${row.name} ${measure}`);
      assert.ok(change.ci_lower <= change.points && change.points <= change.ci_upper, `${row.name} ${measure}`);
      assert.ok(row[measure].y2020.pct >= 0 && row[measure].y2024 >= 0 && row[measure].y2024 <= 100);
      if (change.label.startsWith("Clear")) assert.ok(change.ci_lower > 0 || change.ci_upper < 0, `${row.name} ${measure} clear change must exclude zero`);
    }
    assert.equal(trend.counts[measure]["Clear fall"], labels.filter((label) => label.startsWith("Clear fall")).length);
    assert.equal(trend.counts[measure]["Clear rise"], labels.filter((label) => label.startsWith("Clear rise")).length);
    assert.equal(trend.counts[measure]["No clear change"], labels.filter((label) => label === "No clear change").length);
  }
});

test("the FinScope 2016 to 2024 series reconciles with NISR and each year adds up", () => {
  const series = data.finscopeSeries;
  assert.deepEqual(series.series.map((row) => row.key), ["2016", "2020", "2020r", "2024"]);
  assert.ok(series.checks.length === 5 && series.checks.every((check) => check.ok), "2016 values must match NISR's reported figures");
  for (const row of series.series) {
    const strands = row.banked + row.other_formal + row.informal_only + row.excluded;
    assert.ok(Math.abs(strands - 100) < 0.5, `${row.key} strands total ${strands}`);
    assert.ok(Math.abs(row.formal - (row.banked + row.other_formal)) < 0.2, `${row.key} formal must equal banked plus other formal`);
  }
  const byKey = Object.fromEntries(series.series.map((row) => [row.key, row]));
  assert.ok(byKey["2016"].formal < byKey["2020"].formal && byKey["2020"].formal < byKey["2024"].formal);
  assert.ok(Math.abs(byKey["2020"].formal - byKey["2020r"].formal) <= 1, "formal share must not depend on the banked definition");
});

test("province changes 2016 to 2020 cover five provinces with valid labels and ordered intervals", () => {
  const provinces = data.finscopeSeries.provinces;
  assert.deepEqual(provinces.map((row) => row.province).sort(), ["Eastern", "Kigali City", "Northern", "Southern", "Western"]);
  for (const row of provinces) {
    for (const measure of ["banked", "other_formal", "informal_only", "excluded", "formal"]) {
      const change = row[measure].change;
      assert.ok(change, `${row.province} ${measure}`);
      assert.match(change.label, /^(Clear|Possible) (rise|fall)|^No clear change/);
      assert.ok(change.ci_lower <= change.points && change.points <= change.ci_upper);
      assert.ok(!change.label.includes("30 districts"), "province labels must name the 5-province family");
      if (change.label.startsWith("Clear")) assert.ok(change.ci_lower > 0 || change.ci_upper < 0);
    }
  }
});

test("association ranges are ordered and within -1 to 1", () => {
  for (const link of Object.values(data.access.links)) {
    const [low, high] = link.bootstrap_95_interval;
    assert.ok(low <= link.spearman_rho && link.spearman_rho <= high);
    assert.ok(low >= -1 && high <= 1);
  }
});
