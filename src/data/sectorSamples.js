import { octoberOutcome } from "@/data/programmeDelivery";

// Sample programme records grouped by official sector. SAMPLE DATA: the registry covers 7 districts,
// and some sample sector names are not official sector names, so those records cannot be placed on the map
// and are reported as unmatched instead of being guessed.
export const SECTOR_SAMPLE_NOTE = "Sample programme records, not survey estimates. The EICV7 survey has no figures for single sectors.";

export const normalise = (text) => String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// Spelling variants in the sample data that clearly mean an official sector.
const ALIASES = { "Kamonyi|rugalika": "rugarika", "Gisagara|mugambwa": "mugombwa" };
const keyOf = (district, sector) => `${district}|${ALIASES[`${district}|${normalise(sector)}`] || normalise(sector)}`;

const blank = (district, name) => ({ district, name, enrolled: 0, active: 0, pending: 0, suspended: 0, programmes: {}, payments: { total: 0, delivered: 0, failed: 0, pending: 0 }, healthLapses: 0, coopMembers: new Map(), hostedCoops: [] });

export function buildSectorSamples({ geo, beneficiaries, coopState }) {
  const official = new Map(geo.features.map((feature) => [keyOf(feature.properties.district, feature.properties.shapeName), feature.properties]));
  const byKey = new Map();
  const unmatched = new Map();
  const slot = (props) => { const key = `${props.district}|${props.shapeName}`; if (!byKey.has(key)) byKey.set(key, blank(props.district, props.shapeName)); return byKey.get(key); };
  const memberOf = new Map((coopState?.members || []).map((link) => [link.beneficiaryId, link.coopId]));
  const coopById = new Map((coopState?.coops || []).map((coop) => [coop.id, coop]));
  let matched = 0;

  for (const person of beneficiaries) {
    const props = official.get(keyOf(person.district, person.sector));
    if (!props) {
      const key = `${person.district}|${person.sector}`;
      unmatched.set(key, { district: person.district, sector: person.sector, count: (unmatched.get(key)?.count || 0) + 1 });
      continue;
    }
    matched += 1;
    const row = slot(props);
    row.enrolled += 1;
    if (person.status === "Active") row.active += 1; else if (person.status === "Pending") row.pending += 1; else if (person.status === "Suspended") row.suspended += 1;
    row.programmes[person.programme] = (row.programmes[person.programme] || 0) + 1;
    if (person.health?.status && person.health.status !== "Paid") row.healthLapses += 1;
    const outcome = octoberOutcome(person);
    if (outcome) { row.payments.total += 1; row.payments[outcome.toLowerCase()] += 1; }
    const coop = coopById.get(memberOf.get(person.id));
    if (coop) row.coopMembers.set(coop.id, { coop, members: (row.coopMembers.get(coop.id)?.members || 0) + 1 });
  }

  // Cooperatives are shown in the sector where they are registered, even when none of the records in view belong to them.
  for (const coop of coopState?.coops || []) {
    const props = official.get(keyOf(coop.district, coop.sector));
    if (props) slot(props).hostedCoops.push(coop);
  }
  return { byKey, unmatched: [...unmatched.values()].sort((a, b) => b.count - a.count), matched, total: beneficiaries.length };
}

export function sectorSample(index, district, sector) {
  const row = index?.byKey.get(`${district}|${sector}`);
  if (!row) return null;
  const due = row.payments.total;
  return { ...row, problemRate: due ? (row.payments.failed + row.payments.pending) / due : 0, lapseShare: row.enrolled ? row.healthLapses / row.enrolled : 0, issueShare: row.enrolled ? (row.pending + row.suspended) / row.enrolled : 0 };
}
