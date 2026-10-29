import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  enrichRows,
  filterRows,
  formatInterval,
  markerFor,
  quadrantOf,
  qualityOf,
  reasonToReview,
  sortRows,
  viewToCsv,
} from "./povertySupport.js";

const data = JSON.parse(readFileSync(new URL("../data/dashboard-eicv7-aggregates.json", import.meta.url), "utf8"));
const national = data.national;
const rows = enrichRows(data.districts, national);
const byName = (name) => rows.find((row) => row.name === name);

test("source data covers 30 districts with the documented national references", () => {
  assert.equal(rows.length, 30);
  assert.equal(national.poverty, 27.4);
  assert.equal(national.vupAmongPoor, 15.9);
});

test("district values match the published dashboard rows", () => {
  const nyamagabe = byName("Nyamagabe");
  assert.equal(nyamagabe.poverty, 51.4);
  assert.equal(nyamagabe.vupAmongPoor, 18.5);
  assert.equal(nyamagabe.samplePoorHouseholds, 212);
  const kamonyi = byName("Kamonyi");
  assert.equal(kamonyi.poverty, 39.7);
  assert.equal(kamonyi.vupAmongPoor, 9.2);
});

test("quadrants follow the national reference lines", () => {
  assert.equal(quadrantOf(byName("Kamonyi"), national).key, "reviewFirst");
  assert.equal(quadrantOf(byName("Nyamagabe"), national).key, "higherBoth");
  assert.equal(quadrantOf(byName("Kicukiro"), national).key, "lowerPovertyLowVup");
  assert.equal(quadrantOf(byName("Gicumbi"), national).key, "lowerPovertyHighVup");
});

test("a district exactly on a reference line is not flagged for review", () => {
  const tied = { name: "T", poverty: national.poverty, vupAmongPoor: 1, samplePoorHouseholds: 100 };
  assert.notEqual(quadrantOf(tied, national).key, "reviewFirst");
  const tiedVup = { name: "T", poverty: 40, vupAmongPoor: national.vupAmongPoor, samplePoorHouseholds: 100 };
  assert.equal(quadrantOf(tiedVup, national).key, "higherBoth");
});

test("small samples are marked before any review flag", () => {
  const small = { name: "S", poverty: 60, vupAmongPoor: 2, samplePoorHouseholds: 49 };
  assert.equal(markerFor(small, national).key, "smallSample");
  assert.equal(markerFor({ ...small, samplePoorHouseholds: 50 }, national).key, "twoSignals");
  assert.match(reasonToReview({ ...small, marker: markerFor(small, national), quadrant: quadrantOf(small, national) }), /uncertain/);
});

test("confidence intervals are never fabricated", () => {
  for (const row of rows) {
    assert.equal(formatInterval(row.povertyInterval), "Not calculated");
    assert.equal(formatInterval(row.vupInterval), "Not calculated");
    assert.notEqual(row.quality.key, "assessed");
  }
  assert.equal(formatInterval({ low: 10, high: 20.25 }), "10.0–20.3%");
  assert.equal(qualityOf({ samplePoorHouseholds: 90, povertyInterval: { low: 1, high: 2 }, vupInterval: { low: 1, high: 2 } }).key, "assessed");
});

test("review wording never claims programme failure or a coverage gap", () => {
  for (const row of rows) {
    const text = reasonToReview(row).toLowerCase();
    assert.ok(!text.includes("coverage gap"));
    assert.ok(!/under-?funded/.test(text));
  }
});

test("sorting supports poverty, VUP and name without mutating input", () => {
  const before = rows.map((row) => row.name).join();
  assert.equal(sortRows(rows, "poverty")[0].name, "Nyamagabe");
  assert.equal(sortRows(rows, "vup")[0].vupAmongPoor, Math.max(...rows.map((row) => row.vupAmongPoor)));
  assert.equal(sortRows(rows, "name")[0].name, "Bugesera");
  assert.equal(sortRows(rows, "name", "reverse")[0].name, "Rwamagana");
  assert.equal(rows.map((row) => row.name).join(), before);
});

test("search matches district and province names, ignoring case", () => {
  assert.deepEqual(filterRows(rows, "  gisa ").map((row) => row.name), ["Gisagara"]);
  assert.equal(filterRows(rows, "").length, 30);
  assert.equal(filterRows(rows, "zzz").length, 0);
});

test("CSV export keeps the figures and adds no derived gap column", () => {
  const csv = viewToCsv(rows.slice(0, 2), national);
  const [header, first] = csv.split("\r\n");
  assert.ok(!/gap/i.test(header));
  assert.ok(header.includes("sample_poor_households"));
  assert.ok(first.startsWith('"Bugesera"'));
  assert.ok(first.includes('"Not calculated"'));
});
