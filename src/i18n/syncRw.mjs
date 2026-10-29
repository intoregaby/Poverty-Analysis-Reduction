// Adds every key that English has to rw.json as an empty string, and drops keys English no longer has.
// An empty value is treated as "not translated yet", so the app shows the English text for it.
// Run: node src/i18n/syncRw.mjs   (then give rw.json to the Kinyarwanda reviewer)
import { readFileSync, writeFileSync } from "node:fs";

const load = (name) => JSON.parse(readFileSync(new URL(`./${name}.json`, import.meta.url), "utf8"));
const en = load("en");
const rw = load("rw");

function merge(source, existing = {}) {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [
    key,
    value && typeof value === "object" ? merge(value, existing[key] && typeof existing[key] === "object" ? existing[key] : {}) : (typeof existing[key] === "string" ? existing[key] : ""),
  ]));
}

writeFileSync(new URL("./rw.json", import.meta.url), `${JSON.stringify(merge(en, rw), null, 2)}\n`);
console.log("rw.json now has every key of en.json");
