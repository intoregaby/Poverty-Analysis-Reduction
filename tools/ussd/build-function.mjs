// Copies the shared USSD logic, the formatters and the USSD part of the translation files next to the edge function
// entry, so the function deploys from one folder: supabase/functions/ussd. The texts stay in src/i18n/*.json (one
// source for the web app and USSD); this only copies the `ussd` branch.
// Run: node tools/ussd/build-function.mjs
// Deploy with the Supabase CLI (supabase functions deploy ussd --no-verify-jwt) or the dashboard.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../../", import.meta.url);
const out = new URL("supabase/functions/ussd/", root);
mkdirSync(out, { recursive: true });
for (const [from, to] of [["tools/ussd/function/index.ts", "index.ts"], ["src/ussd/core.js", "core.js"], ["src/ussd/gateway.js", "gateway.js"], ["src/lib/format.js", "format.js"]]) copyFileSync(new URL(from, root), new URL(to, out));
for (const language of ["en", "rw"]) {
  const all = JSON.parse(readFileSync(new URL(`src/i18n/${language}.json`, root), "utf8"));
  writeFileSync(new URL(`${language}.json`, out), `${JSON.stringify({ ussd: all.ussd }, null, 2)}\n`);
}
console.log("Wrote supabase/functions/ussd/");
