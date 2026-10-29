import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildTour, PAGE_STEPS } from "./tours.js";
import { NAV_GROUPS, ROLES, navForRole } from "../../lib/roles.js";

const loadJson = (name) => JSON.parse(readFileSync(new URL(`../../i18n/${name}.json`, import.meta.url), "utf8"));
const en = loadJson("en");
const rw = loadJson("rw");
const SRC = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(jsx|js)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

// Every marker that exists in the code: data-tour="x", the <Card tour="x"> prop, or tourName="x".
const markers = new Set();
for (const file of sourceFiles(SRC)) {
  for (const match of readFileSync(file, "utf8").matchAll(/(?:data-tour|tour|tourName)="([a-z0-9-]+)"/g)) markers.add(match[1]);
}
// Menu markers are built from each item's path.
for (const group of NAV_GROUPS) for (const item of group.items) markers.add(`nav-${item.to === "/" ? "poverty-analysis" : item.to.replace(/^\//, "")}`);

const lookup = (tree, key) => key.split(".").reduce((node, part) => (node == null ? node : node[part]), tree);

test("every step of every role's tour points at a marker that exists, and has English text", () => {
  for (const role of Object.keys(ROLES)) {
    const items = navForRole(role).flatMap((group) => group.items);
    for (const item of items) {
      const steps = buildTour(item.to, items);
      assert.ok(steps.length >= 4, `${role} ${item.to}: tour has steps`);
      for (const step of steps) {
        assert.ok(markers.has(step.target), `${role} ${item.to}: marker "${step.target}" (step ${step.id}) is not in the code`);
        assert.equal(typeof lookup(en, step.titleKey), "string", `missing en title ${step.titleKey}`);
        assert.equal(typeof lookup(en, step.textKey), "string", `missing en text ${step.textKey}`);
      }
    }
  }
});

test("the tour never mentions a menu item the role cannot see", () => {
  const items = navForRole("gov_district").flatMap((group) => group.items);
  const ids = buildTour("/government", items).map((step) => step.id);
  assert.ok(ids.includes("nav-map"));
  assert.ok(!ids.includes("nav-programmes"));
  assert.ok(!ids.includes("nav-evidence"));
});

test("steps use stable markers only", () => {
  for (const [page, steps] of Object.entries(PAGE_STEPS)) for (const step of steps) {
    assert.equal(typeof step.target, "string", `${page}: ${step.id}`);
    assert.ok(!("heading" in step) && !step.target.includes(" "), `${page}: ${step.id} must not use heading text`);
  }
});

test("Kinyarwanda has no key that English lacks, so nothing is ever orphaned", () => {
  const walk = (tree, base = "") => Object.entries(tree).flatMap(([k, v]) => (v && typeof v === "object" ? walk(v, `${base}${k}.`) : [`${base}${k}`]));
  const enKeys = new Set(walk(en));
  for (const key of walk(rw)) assert.ok(enKeys.has(key), `rw has an extra key ${key}`);
});
