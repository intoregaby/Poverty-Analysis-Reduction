import test from "node:test";
import assert from "node:assert/strict";
import { mapScope, districtAllowed, sectorAllowed, scopeDistrictRows, scopeDistrictGeo, scopeSectorFeatures } from "./geoScope.js";

const geo = { type: "FeatureCollection", features: ["Nyaruguru", "Gisagara", "Huye"].map((shapeName) => ({ properties: { shapeName } })) };
const sectors = [{ properties: { district: "Nyaruguru", shapeName: "Kibeho" } }, { properties: { district: "Nyaruguru", shapeName: "Mata" } }, { properties: { district: "Huye", shapeName: "Mata" } }];

test("admins and analysts see everything", () => {
  for (const role of ["platform_admin", "nisr_analyst", "programme_owner"]) assert.equal(mapScope(role).all, true);
  assert.equal(scopeDistrictGeo(geo, mapScope("platform_admin")).features.length, 3);
});

test("a district user sees only their district and its sectors", () => {
  const scope = mapScope("gov_district", { district: "Nyaruguru" });
  assert.deepEqual(scopeDistrictGeo(geo, scope).features.map((f) => f.properties.shapeName), ["Nyaruguru"]);
  assert.deepEqual(scopeDistrictRows([{ name: "Huye" }, { name: "Nyaruguru" }], scope), [{ name: "Nyaruguru" }]);
  assert.deepEqual(scopeSectorFeatures(sectors, scope).map((f) => f.properties.shapeName), ["Kibeho", "Mata"]);
  assert.equal(districtAllowed(scope, "Huye"), false);
});

test("a sector user sees only their own sector, and a same-named sector elsewhere stays hidden", () => {
  const scope = mapScope("gov_sector", { district: "Nyaruguru", sector: "Mata" });
  assert.equal(sectorAllowed(scope, "Nyaruguru", "Mata"), true);
  assert.equal(sectorAllowed(scope, "Huye", "Mata"), false);
  assert.equal(sectorAllowed(scope, "Nyaruguru", "Kibeho"), false);
});

test("a scoped user with no district sees nothing", () => {
  const scope = mapScope("gov_district", {});
  assert.equal(scopeDistrictGeo(geo, scope).features.length, 0);
});
