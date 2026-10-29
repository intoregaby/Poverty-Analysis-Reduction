// Layer definitions for the District Map. Pure functions only, so they can be tested.
//
// Every layer reads the same EICV7 2023/24 district aggregates as the Poverty
// Analysis dashboard, so the map and the charts always agree. The earlier
// FinScope "financially excluded" and "coverage of poor" layers were removed:
// their district values could not be reconciled with the published national
// figures or with the EICV7 VUP definition.
import { markerFor } from "./povertySupport.js";

export const NO_DATA = "#EFF2F7";

const PURPLE = ["#EFEDFF", "#D3CEFF", "#ACA5FF", "#847BFF", "#635BFF"];
const TEAL = ["#EAF7F4", "#C6EDE6", "#96DFD3", "#5FCCBC", "#14B8A6"];

export const MARKER_COLORS = {
  twoSignals: { label: "Two signals", color: "#635BFF", note: "Poverty above and VUP below the national rate" },
  highPoverty: { label: "High poverty", color: "#B9B4FF", note: "Poverty above the national rate" },
  noFlag: { label: "No flag", color: "#E6EAF1", note: "Poverty at or below the national rate" },
  smallSample: { label: "Small sample", color: "#F7D9A3", note: "Under 50 surveyed poor households" },
};

export const MAP_LAYERS = {
  poverty: {
    key: "poverty",
    label: "Poverty",
    unit: "% of people",
    domain: [5, 55],
    ramp: PURPLE,
    value: (row) => row.poverty,
    help: "The percentage of people living below the poverty line, EICV7 2023/24. It counts people, not households.",
  },
  extreme: {
    key: "extreme",
    label: "Extreme poverty",
    unit: "% of people",
    domain: [0, 15],
    ramp: PURPLE,
    value: (row) => row.extremePoverty,
    help: "The percentage of people below the food poverty line, EICV7 2023/24. These people cannot afford enough food.",
  },
  vup: {
    key: "vup",
    label: "VUP participation",
    unit: "% of poor households",
    domain: [0, 30],
    ramp: TEAL,
    value: (row) => row.vupAmongPoor,
    help: "Among households classified as poor, the weighted percentage that report taking part in a VUP programme. It is reported participation, not payments received or eligibility. Districts with dashed outlines have fewer than 50 surveyed poor households.",
  },
  review: {
    key: "review",
    label: "Review marker",
    unit: "",
    categorical: true,
    help: "Compares each district with the national rates. Two signals means poverty is above the national rate and VUP participation among poor households is below it. This is a reason to look closer, not proof of a problem.",
  },
};

export const LAYER_KEYS = Object.keys(MAP_LAYERS);

export const hasValue = (value) => typeof value === "number" && Number.isFinite(value);

export function binIndex(value, [min, max], bins) {
  const t = Math.min(0.999, Math.max(0, (value - min) / (max - min)));
  return Math.floor(t * bins);
}

export function fillFor(layerKey, row, national) {
  const layer = MAP_LAYERS[layerKey];
  if (!layer || !row) return NO_DATA;
  if (layer.categorical) return MARKER_COLORS[markerFor(row, national).key]?.color || NO_DATA;
  const value = layer.value(row);
  if (!hasValue(value)) return NO_DATA;
  return layer.ramp[binIndex(value, layer.domain, layer.ramp.length)];
}

// What the hover card and the list show for one district on one layer.
export function describeValue(layerKey, row, national) {
  const layer = MAP_LAYERS[layerKey];
  if (!row) return "No data";
  if (layer.categorical) return markerFor(row, national).label;
  const value = layer.value(row);
  return hasValue(value) ? `${value.toFixed(1)}%` : "No data";
}

export const isSmallSampleLayer = (layerKey, row) => layerKey === "vup" && Boolean(row) && row.samplePoorHouseholds < 50;
