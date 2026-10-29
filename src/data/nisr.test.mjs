import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DISTRICTS, PROVINCES } from "./nisr.js";

const read = (name) => JSON.parse(readFileSync(new URL(`./${name}`, import.meta.url), "utf8"));

test("the district list holds only names and provinces, never statistics", () => {
  assert.equal(DISTRICTS.length, 30);
  for (const row of DISTRICTS) {
    assert.deepEqual(Object.keys(row).sort(), ["name", "province"]);
    assert.ok(PROVINCES.includes(row.province), row.name);
  }
});

test("district names agree across every data file", () => {
  const names = DISTRICTS.map((row) => row.name).sort();
  assert.deepEqual(read("dashboard-eicv7-aggregates.json").districts.map((row) => row.name).sort(), names);
  assert.deepEqual(read("dashboard-trends.json").districts.map((row) => row.name).sort(), names);
  assert.deepEqual(read("dashboard-trends.json").access.districts.map((row) => row.name).sort(), names);
});

test("national EICV7 figures used on the National Goals page match NISR's published values", () => {
  const { national } = read("dashboard-eicv7-aggregates.json");
  assert.equal(national.poverty, 27.4);
  assert.equal(national.extremePoverty, 5.4);
  assert.ok(national.vupAmongAllHouseholds > 0 && national.vupAmongAllHouseholds < 100);
});
