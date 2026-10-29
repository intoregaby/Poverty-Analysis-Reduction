// Which part of the map a role may see. Pure functions so the same rule can be tested and mirrored in the database.
// A district user sees only their district (and its sectors); a sector or cell user sees only their own sector.
// Admins, analysts and programme owners see all of Rwanda.
const DISTRICT_ROLES = ["gov_district"];
const SECTOR_ROLES = ["gov_sector", "gov_cell"];

export function mapScope(role, area = {}) {
  if (DISTRICT_ROLES.includes(role)) return { all: false, district: area.district || null, sector: null };
  if (SECTOR_ROLES.includes(role)) return { all: false, district: area.district || null, sector: area.sector || null };
  return { all: true, district: null, sector: null };
}

export const districtAllowed = (scope, district) => scope.all || (Boolean(scope.district) && scope.district === district);

export const sectorAllowed = (scope, district, sector) => scope.all || (districtAllowed(scope, district) && (!scope.sector || scope.sector === sector));

// A scoped user with no district on their account sees nothing rather than everything.
export const scopeDistrictRows = (rows, scope) => rows.filter((row) => districtAllowed(scope, row.name));

export function scopeDistrictGeo(geo, scope) {
  if (!geo || scope.all) return geo;
  return { ...geo, features: geo.features.filter((feature) => districtAllowed(scope, feature.properties.shapeName)) };
}

export function scopeSectorFeatures(features, scope) {
  return scope.all ? features : features.filter((feature) => sectorAllowed(scope, feature.properties.district, feature.properties.shapeName));
}
