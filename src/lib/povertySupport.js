// Pure helpers for the Poverty & Social Support section.
//
// Everything here works on the EICV7 district aggregates in
// data/dashboard-eicv7-aggregates.json and never invents values: confidence
// intervals are only passed through when the source row supplies them.
//
// Poverty is a share of PEOPLE; VUP participation is a share of surveyed POOR
// HOUSEHOLDS. The two have different denominators, so no helper here subtracts
// one from the other.

// Display rule carried over from the existing dashboard: a district estimate
// built on fewer than 50 surveyed poor households is flagged as a small sample.
// This is a dashboard convention, not an NISR publication threshold.
export const SMALL_SAMPLE_POOR_HOUSEHOLDS = 50;

export const QUADRANTS = {
  reviewFirst: {
    key: "reviewFirst",
    label: "Review first",
    detail: "Higher poverty, lower VUP participation",
  },
  higherBoth: {
    key: "higherBoth",
    label: "Higher poverty, higher VUP",
    detail: "Higher poverty, higher VUP participation",
  },
  lowerPovertyLowVup: {
    key: "lowerPovertyLowVup",
    label: "Lower poverty, lower VUP",
    detail: "Lower poverty, lower VUP participation",
  },
  lowerPovertyHighVup: {
    key: "lowerPovertyHighVup",
    label: "Lower poverty, higher VUP",
    detail: "Lower poverty, higher VUP participation",
  },
};

// A district sitting exactly on a reference line counts as "higher" on that axis
// only when strictly above it, so a tie never creates a review flag.
export function quadrantOf(row, national) {
  const highPoverty = row.poverty > national.poverty;
  const lowVup = row.vupAmongPoor < national.vupAmongPoor;
  if (highPoverty) return lowVup ? QUADRANTS.reviewFirst : QUADRANTS.higherBoth;
  return lowVup ? QUADRANTS.lowerPovertyLowVup : QUADRANTS.lowerPovertyHighVup;
}

export const isSmallSample = (row) => row.samplePoorHouseholds < SMALL_SAMPLE_POOR_HOUSEHOLDS;

export const hasInterval = (interval) =>
  Boolean(interval) && Number.isFinite(interval.low) && Number.isFinite(interval.high);

export function formatInterval(interval) {
  return hasInterval(interval) ? `${interval.low.toFixed(1)}–${interval.high.toFixed(1)}%` : "Not calculated";
}

// Review marker. Order matters: a small sample is reported first because the
// other two markers are not reliable on a thin sample.
export function markerFor(row, national) {
  if (isSmallSample(row)) return { key: "smallSample", label: "Small sample", tone: "warn" };
  const quadrant = quadrantOf(row, national);
  if (quadrant.key === "reviewFirst") return { key: "twoSignals", label: "Two signals", tone: "brand" };
  if (row.poverty > national.poverty) return { key: "highPoverty", label: "High poverty", tone: "neutral" };
  return { key: "noFlag", label: "No flag", tone: "muted" };
}

export function qualityOf(row) {
  const intervals = hasInterval(row.povertyInterval) && hasInterval(row.vupInterval);
  if (isSmallSample(row)) {
    return {
      key: "small",
      label: "Small sample",
      tone: "warn",
      note: `Only ${row.samplePoorHouseholds} surveyed poor households. Treat the VUP figure as a rough indication.`,
    };
  }
  if (!intervals) {
    return {
      key: "unassessed",
      label: "Uncertainty not assessed",
      tone: "neutral",
      note: "Confidence intervals were not calculated for this estimate.",
    };
  }
  return { key: "assessed", label: "Interval available", tone: "ok", note: "Confidence intervals are available." };
}

export function enrichRows(rows, national) {
  return rows.map((row) => ({
    ...row,
    quadrant: quadrantOf(row, national),
    marker: markerFor(row, national),
    quality: qualityOf(row),
  }));
}

export const SORTERS = {
  poverty: { label: "Poverty rate", compare: (a, b) => b.poverty - a.poverty || a.name.localeCompare(b.name) },
  vup: { label: "VUP participation", compare: (a, b) => b.vupAmongPoor - a.vupAmongPoor || a.name.localeCompare(b.name) },
  name: { label: "District name", compare: (a, b) => a.name.localeCompare(b.name) },
  sample: { label: "Sample size", compare: (a, b) => b.samplePoorHouseholds - a.samplePoorHouseholds || a.name.localeCompare(b.name) },
};

export function sortRows(rows, key = "poverty", direction = "default") {
  const sorter = SORTERS[key] || SORTERS.poverty;
  const sorted = [...rows].sort(sorter.compare);
  // "default" keeps each sorter's natural direction (high to low, A to Z).
  return direction === "reverse" ? sorted.reverse() : sorted;
}

export function filterRows(rows, query) {
  const text = String(query || "").trim().toLowerCase();
  if (!text) return rows;
  return rows.filter((row) => row.name.toLowerCase().includes(text) || String(row.province || "").toLowerCase().includes(text));
}

// Plain observations. These restate the data; they never interpret it.
export function observationsFor(row, national) {
  const side = (value, reference) => (value > reference ? "above" : value < reference ? "below" : "equal to");
  const lines = [
    `Poverty is ${row.poverty.toFixed(1)}% of people, ${side(row.poverty, national.poverty)} the national ${national.poverty.toFixed(1)}%.`,
    `${row.vupAmongPoor.toFixed(1)}% of surveyed poor households report VUP participation, ${side(row.vupAmongPoor, national.vupAmongPoor)} the national ${national.vupAmongPoor.toFixed(1)}%.`,
    `The VUP figure comes from ${row.samplePoorHouseholds} surveyed poor households (${row.sampleHouseholds} households surveyed in total).`,
  ];
  if (!hasInterval(row.vupInterval)) lines.push("Confidence intervals were not calculated, so small differences from the national value may not be real.");
  return lines;
}

// Interpretation text is deliberately cautious: it says why a district may be
// worth a closer look, never that a programme has failed.
export function reasonToReview(row) {
  const key = row.quadrant?.key;
  if (row.marker?.key === "smallSample") {
    return "Few poor households were surveyed here, so the figures are uncertain. Check them against other evidence before drawing any conclusion.";
  }
  if (key === "reviewFirst") {
    return "Poverty is above the national rate while reported VUP participation among poor households is below its national rate. This is a reason to look at the evidence more closely. It does not show that support is missing or that a programme has failed.";
  }
  if (key === "higherBoth") {
    return "Poverty is above the national rate. Reported VUP participation among poor households is also at or above its national rate.";
  }
  if (key === "lowerPovertyLowVup") {
    return "Poverty is at or below the national rate. Reported VUP participation among poor households is below its national rate, which may be expected where fewer households are poor.";
  }
  return "Poverty is at or below the national rate, and reported VUP participation among poor households is at or above its national rate.";
}

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

// The CSV repeats what the chart shows and adds no derived "gap" column.
export function viewToCsv(rows, national) {
  const header = [
    "district",
    "province",
    "poverty_people_2023_24_pct",
    "vup_participation_surveyed_poor_households_2023_24_pct",
    "sample_poor_households",
    "sample_households",
    "poverty_ci_pct",
    "vup_ci_pct",
    "data_quality",
    "review_marker",
    "poverty_vs_national_reference",
    "vup_vs_national_reference",
  ];
  const side = (value, reference) => (value > reference ? "above" : value < reference ? "below" : "equal");
  const body = rows.map((row) => [
    row.name,
    row.province,
    row.poverty,
    row.vupAmongPoor,
    row.samplePoorHouseholds,
    row.sampleHouseholds,
    formatInterval(row.povertyInterval),
    formatInterval(row.vupInterval),
    qualityOf(row).label,
    markerFor(row, national).label,
    side(row.poverty, national.poverty),
    side(row.vupAmongPoor, national.vupAmongPoor),
  ]);
  return [header, ...body].map((record) => record.map(csvCell).join(",")).join("\r\n");
}
