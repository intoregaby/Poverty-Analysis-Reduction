import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

// Rwanda Data Sharing Platform (data.gov.rw): an open API publishes the catalogue and every dataset's data dictionary.
const API = "https://api.data.gov.rw/api/v1";
const SITE = "https://data.gov.rw";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PLATFORM = { name: "Rwanda Data Sharing Platform", url: `${SITE}/` };

const decode = (value) => value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
const plain = (html) => decode(String(html || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function compact(item) {
  const columns = (item.columns || []).filter((column) => column.accessible !== false).map((column) => {
    const note = plain(column.curatedDescription || column.description || column.syncedDescription).slice(0, 60);
    return { name: column.columnName, note: note && note.toLowerCase() !== String(column.columnName).toLowerCase() ? note : "" };
  });
  return {
    id: item.id, name: item.displayName || item.tableName, publisher: item.organization?.name || item.ownerName || "",
    sectors: (item.sectors || []).map((sector) => sector.name || sector), formats: (item.downloadFormats || []).map((format) => String(format.label || format.format).toUpperCase()),
    updated: String(item.updatedAt || "").slice(0, 10), summary: plain(item.curatedDescription || item.description || item.syncedDescription).slice(0, 500), columns,
  };
}

async function download(fetchImpl) {
  const datasets = [];
  let total = 0;
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetchImpl(`${API}/datasets/public?page=${page}&limit=50`, { headers: { Accept: "application/json", "User-Agent": "NISR-Track2-Investigation/1.0" }, redirect: "error", signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`The data platform answered with an error (${response.status}).`);
    const body = (await response.json())?.payload;
    if (!Array.isArray(body?.items)) throw new Error("The data platform's catalogue was not in the expected format.");
    datasets.push(...body.items.map(compact));
    total = body.totalItems ?? datasets.length;
    if (page >= (body.totalPages || 1)) break;
  }
  return { fetched_at: new Date().toISOString(), total, datasets };
}

let memory = null;
let loading = null;

// Cached on disk and refreshed daily. If the platform is down, the last saved copy is still used.
export async function loadPlatformCatalog(cacheFile, fetchImpl = fetch, { force = false } = {}) {
  const fresh = (value) => value && Date.now() - Date.parse(value.fetched_at) < MAX_AGE_MS;
  if (!force && fresh(memory)) return memory;
  if (loading) return loading;
  loading = (async () => {
    try {
      let saved = memory;
      if (!saved) { try { saved = JSON.parse(await readFile(cacheFile, "utf8")); } catch { saved = null; } }
      if (!force && fresh(saved)) { memory = saved; return saved; }
      try {
        const value = await download(fetchImpl);
        await mkdir(path.dirname(cacheFile), { recursive: true });
        const temporary = `${cacheFile}.${randomUUID()}.tmp`;
        await writeFile(temporary, JSON.stringify(value), "utf8");
        await rename(temporary, cacheFile);
        memory = value;
        return value;
      } catch (failure) {
        if (saved) { memory = { ...saved, stale: true }; return memory; }
        throw failure;
      }
    } finally { loading = null; }
  })();
  return loading;
}

const WORDS = /[a-z0-9À-ɏ]{3,}/g;
const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "what", "how", "are", "was", "were", "has", "have", "which", "about", "into", "than", "then", "does", "not", "you", "can", "please", "show", "give", "tell", "its", "their", "our", "your", "any", "all", "data", "dataset", "datasets", "platform", "sharing", "added", "website", "page", "variable", "variables", "look", "investigate", "could", "help", "helps", "there", "using", "use", "used", "should", "who", "when", "where", "also", "need", "needs", "want", "like", "find", "see", "why", "might", "high", "here", "exist", "exists", "available"]);

// Ranks datasets for a question. Rare words (savings, VUP, disability) count far more than common ones.
export function searchPlatform(catalog, question, limit = 4) {
  const terms = [...new Set((String(question).toLowerCase().match(WORDS) || []).filter((word) => !STOP.has(word)))];
  if (!terms.length || !catalog?.datasets?.length) return [];
  const docs = catalog.datasets.map((item) => ({ item, name: item.name.toLowerCase(), lower: `${item.name} ${item.sectors.join(" ")} ${item.summary} ${item.columns.map((column) => `${column.name} ${column.note}`).join(" ")}`.toLowerCase() }));
  const weights = terms.map((term) => { const found = docs.filter((doc) => doc.lower.includes(term)).length; return found ? Math.log(1 + docs.length / found) : 0; });
  return docs
    .map((doc) => ({ ...doc, score: terms.reduce((sum, term, i) => sum + (doc.lower.includes(term) ? weights[i] : 0) + (doc.name.includes(term) ? weights[i] : 0), 0) }))
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((doc, index) => {
      const { item } = doc;
      const shown = item.columns.slice(0, 45).map((column) => (column.note ? `${column.name} (${column.note})` : column.name)).join("; ");
      return {
        tag: `P${index + 1}`, id: item.id, name: item.name, url: `${SITE}/datasets/${item.id}`, score: doc.score,
        text: `${item.name} | Publisher: ${item.publisher || "unknown"} | Sectors: ${item.sectors.join(", ") || "none listed"} | Formats: ${item.formats.join(", ") || "not listed"} | Updated: ${item.updated}\nColumns (${item.columns.length}${item.columns.length > 45 ? ", first 45 shown" : ""}): ${shown}\nSummary: ${item.summary}`.slice(0, 1500),
      };
    });
}
