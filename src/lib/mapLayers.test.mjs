import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LAYER_KEYS, MAP_LAYERS, MARKER_COLORS, NO_DATA, binIndex, describeValue, fillFor, isSmallSampleLayer } from "./mapLayers.js";

const data = JSON.parse(readFileSync(new URL("../data/dashboard-eicv7-aggregates.json", import.meta.url), "utf8"));
const national = data.national;
const byName = (name) => data.districts.find((row) => row.name === name);
const geo = JSON.parse(readFileSync(new URL("../../public/geo/rwanda-districts.json", import.meta.url), "utf8"));

test("every map boundary has matching data and every district has a boundary", () => {
  const shapes = geo.features.map((feature) => feature.properties.shapeName).sort();
  const names = data.districts.map((row) => row.name).sort();
  assert.deepEqual(shapes, names);
});

test("only verified EICV7 layers are offered", () => {
  assert.deepEqual(LAYER_KEYS, ["poverty", "extreme", "vup", "review"]);
});

test("binning stays inside the colour ramp", () => {
  assert.equal(binIndex(-10, [5, 55], 5), 0);
  assert.equal(binIndex(5, [5, 55], 5), 0);
  assert.equal(binIndex(30, [5, 55], 5), 2);
  assert.equal(binIndex(55, [5, 55], 5), 4);
  assert.equal(binIndex(500, [5, 55], 5), 4);
});

test("colours follow the values", () => {
  const ramp = MAP_LAYERS.poverty.ramp;
  assert.equal(fillFor("poverty", byName("Nyamagabe"), national), ramp[4]);
  assert.equal(fillFor("poverty", byName("Kicukiro"), national), ramp[0]);
});

test("missing districts and values use the no-data colour", () => {
  assert.equal(fillFor("poverty", undefined, national), NO_DATA);
  assert.equal(fillFor("vup", { vupAmongPoor: null }, national), NO_DATA);
  assert.equal(describeValue("vup", { vupAmongPoor: NaN }, national), "No data");
  assert.equal(describeValue("poverty", undefined, national), "No data");
});

test("review layer reuses the dashboard review markers", () => {
  assert.equal(fillFor("review", byName("Kamonyi"), national), MARKER_COLORS.twoSignals.color);
  assert.equal(describeValue("review", byName("Kamonyi"), national), "Two signals");
  assert.equal(describeValue("review", byName("Kicukiro"), national), "Small sample");
  assert.equal(fillFor("review", byName("Nyamagabe"), national), MARKER_COLORS.highPoverty.color);
});

test("small VUP samples are flagged only on the VUP layer", () => {
  assert.equal(isSmallSampleLayer("vup", byName("Kicukiro")), true);
  assert.equal(isSmallSampleLayer("poverty", byName("Kicukiro")), false);
  assert.equal(isSmallSampleLayer("vup", byName("Gisagara")), false);
});

test("displayed values match the source rows", () => {
  assert.equal(describeValue("poverty", byName("Gisagara"), national), "45.6%");
  assert.equal(describeValue("vup", byName("Gisagara"), national), "18.2%");
});
