import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { assertPublicUrl, fetchWebSource, pickPassages } from "./web-source.mjs";

const MAX_PAGES = 40;
const MAX_FILES = 6;
const MAX_MS = 6 * 60 * 1000;
const FILE_LINK = /\.(pdf|csv|json|xlsx)$/i;
const PAGE_LINK = /(^|\/)[^/.]*$|\.(html?|php|aspx?|jsp)$/i;
const SKIP_PATH = /\/(login|logout|signin|sign-in|signup|register|cart|checkout|account|wp-admin|admin|search|print|feed|rss|tag|calendar)(\/|$)/i;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hostKey = (host) => host.replace(/^www\./, "").toLowerCase();
const sitesDir = (root) => path.join(root, "cache", "sites");
const validSiteId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- robots.txt: the site's own rules about what automated readers may visit ----------
export function parseRobots(text) {
  const rules = { disallow: [], allow: [], delay: 0, sitemaps: [] };
  let agents = [];
  let inRules = false;
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const at = line.indexOf(":");
    if (at < 0) continue;
    const key = line.slice(0, at).trim().toLowerCase();
    const value = line.slice(at + 1).trim();
    if (key === "sitemap") { if (/^https?:/i.test(value)) rules.sitemaps.push(value); continue; }
    if (key === "user-agent") { if (inRules) { agents = []; inRules = false; } agents.push(value.toLowerCase()); continue; }
    if (!["disallow", "allow", "crawl-delay"].includes(key)) continue;
    inRules = true;
    if (!agents.includes("*")) continue;
    if (key === "disallow" && value) rules.disallow.push(value);
    else if (key === "allow" && value) rules.allow.push(value);
    else if (key === "crawl-delay") rules.delay = Math.min(Number(value) || 0, 5);
  }
  return rules;
}

// Rules may use * (anything) and a trailing $ (end of address); the longest matching rule wins.
const ruleExpression = (rule) => new RegExp(`^${rule.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}`);

export function robotsAllows(rules, url) {
  const target = url.pathname + url.search;
  const longest = (list) => list.filter((rule) => ruleExpression(rule).test(target)).reduce((max, rule) => Math.max(max, rule.length), -1);
  const blocked = longest(rules.disallow);
  return blocked < 0 || longest(rules.allow) >= blocked;
}

async function readText(url, fetchImpl, lookup) {
  try {
    const safe = await assertPublicUrl(url, lookup);
    const response = await fetchImpl(safe, { redirect: "follow", headers: { "User-Agent": "NISR-Track2-Investigation/1.0 (analyst-added site)" }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return "";
    return (await response.text()).slice(0, 2_000_000);
  } catch { return ""; }
}

async function sitemapUrls(rules, origin, fetchImpl, lookup) {
  const found = [];
  const queue = rules.sitemaps.length ? rules.sitemaps.slice(0, 3) : [`${origin}/sitemap.xml`];
  for (let i = 0; i < queue.length && i < 6 && found.length < 400; i += 1) {
    const xml = await readText(queue[i], fetchImpl, lookup);
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1].replace(/&amp;/g, "&"));
    if (/<sitemapindex/i.test(xml)) queue.push(...locs.slice(0, 3));
    else found.push(...locs);
  }
  return found;
}

function normalize(link, base, host) {
  let url;
  try { url = new URL(link, base); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol) || hostKey(url.hostname) !== host) return null;
  url.hash = "";
  if (SKIP_PATH.test(url.pathname)) return null;
  return url;
}

// ---------- the crawl ----------
export async function crawlSite(startAddress, { fetchImpl = fetch, lookup, python, makeRenderer, maxPages = MAX_PAGES, maxFiles = MAX_FILES, onProgress = () => {}, delayMs = 350 } = {}) {
  const start = await assertPublicUrl(startAddress, lookup);
  const host = hostKey(start.hostname);
  const origin = start.origin;
  const rules = parseRobots(await readText(`${origin}/robots.txt`, fetchImpl, lookup));
  const pause = Math.max(delayMs, rules.delay * 1000);
  const pages = [];
  const errors = [];
  const seen = new Set();
  const queue = [start];
  const fileQueue = [];
  const begun = Date.now();
  const renderer = makeRenderer ? makeRenderer(lookup) : null;
  let truncated = false;

  const enqueue = (link, base) => {
    const url = normalize(link, base, host);
    if (!url || seen.has(url.toString()) || !robotsAllows(rules, url)) return;
    seen.add(url.toString());
    if (FILE_LINK.test(url.pathname)) { if (fileQueue.length < maxFiles * 3) fileQueue.push(url); }
    else if (PAGE_LINK.test(url.pathname)) queue.push(url);
  };
  seen.add(start.toString());
  for (const link of await sitemapUrls(rules, origin, fetchImpl, lookup)) enqueue(link, origin);
  // Shallow pages first: they are usually the most general.
  queue.sort((a, b) => a.pathname.split("/").length - b.pathname.split("/").length);

  const visit = async (url, isFile) => {
    try {
      const page = await fetchWebSource(url.toString(), fetchImpl, lookup, { python, allowShort: true, renderer });
      if (page.text.length >= 80) pages.push({ url: page.url, title: page.title, kind: page.kind, text: page.text, rows: page.rows ?? null, pages: page.pages ?? null });
      if (!isFile) for (const link of page.links || []) enqueue(link, url);
      for (const file of page.files || []) enqueue(file.url, url);
    } catch (failure) { errors.push({ url: url.toString(), message: failure.message }); }
    onProgress({ fetched: pages.length, queued: queue.length + fileQueue.length, current: url.toString() });
    await wait(pause);
  };

  let first = true;
  while (queue.length && pages.length < maxPages) {
    if (Date.now() - begun > MAX_MS) { truncated = true; break; }
    const url = first ? queue.splice(queue.findIndex((item) => item.toString() === start.toString()), 1)[0] : queue.shift();
    first = false;
    await visit(url, false);
  }
  if (queue.length) truncated = true;
  const files = fileQueue.slice(0, maxFiles);
  for (const url of files) { if (Date.now() - begun > MAX_MS) { truncated = true; break; } await visit(url, true); }
  await renderer?.close();
  if (!pages.length) throw new Error(errors[0]?.message || "No readable pages were found on this website.");
  return { host, start: start.toString(), pages, errors: errors.slice(0, 20), truncated, duration_ms: Date.now() - begun, robots: { disallow: rules.disallow.length, sitemap: rules.sitemaps.length > 0 } };
}

// ---------- the store: one JSON file per connected site, shared by every investigation ----------
async function writeAtomic(file, value) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value), "utf8");
  await rename(temporary, file);
}

const running = new Set();

export async function listSites(root) {
  const dir = sitesDir(root);
  const out = [];
  let names = [];
  try { names = await readdir(dir); } catch { return out; }
  for (const name of names.filter((item) => item.endsWith(".json"))) {
    try {
      const site = JSON.parse(await readFile(path.join(dir, name), "utf8"));
      // A crawl that was running when the server stopped cannot finish by itself.
      if (site.status === "Crawling" && !running.has(site.id)) site.status = "Interrupted";
      out.push(site);
    } catch { /* skip an unreadable file */ }
  }
  return out.sort((a, b) => (b.added_at || "").localeCompare(a.added_at || ""));
}

export const publicSite = ({ pages, ...site }) => ({ ...site, page_count: pages?.length || 0, file_count: pages?.filter((page) => ["pdf", "csv", "json", "xlsx"].includes(page.kind)).length || 0, characters: pages?.reduce((sum, page) => sum + page.text.length, 0) || 0 });

export async function startCrawl(root, address, options = {}, existingId = null) {
  const start = await assertPublicUrl(address, options.lookup);
  const sites = await listSites(root);
  const same = sites.find((site) => hostKey(new URL(site.start).hostname) === hostKey(start.hostname));
  if (same && same.id !== existingId) throw new Error("That website is already connected. Use Crawl again to refresh it.");
  if (!existingId && sites.length >= 10) throw new Error("Ten websites are already connected. Remove one first.");
  await mkdir(sitesDir(root), { recursive: true });
  const id = existingId || randomUUID();
  const file = path.join(sitesDir(root), `${id}.json`);
  let site = existingId ? sites.find((item) => item.id === id) : null;
  site = { ...(site || {}), id, start: start.toString(), host: hostKey(start.hostname), name: site?.name || hostKey(start.hostname), status: "Crawling", added_at: site?.added_at || new Date().toISOString(), progress: { fetched: 0, queued: 0 }, error: null, pages: site?.pages || [] };
  await writeAtomic(file, site);
  running.add(id);
  // The crawl continues after the request has been answered; progress is saved as it goes.
  (async () => {
    let last = 0;
    try {
      const result = await crawlSite(start.toString(), { ...options, onProgress: (progress) => { if (Date.now() - last > 1500) { last = Date.now(); void writeAtomic(file, { ...site, progress }).catch(() => {}); } } });
      await writeAtomic(file, { ...site, status: "Ready", pages: result.pages, errors: result.errors, truncated: result.truncated, crawled_at: new Date().toISOString(), duration_ms: result.duration_ms, robots: result.robots, progress: { fetched: result.pages.length, queued: 0 }, error: null });
    } catch (failure) {
      await writeAtomic(file, { ...site, status: site.pages?.length ? "Ready" : "Failed", error: failure instanceof Error ? failure.message : "The crawl failed." }).catch(() => {});
    } finally { running.delete(id); }
  })();
  return id;
}

export async function removeSite(root, id) {
  if (!validSiteId.test(id)) throw new Error("Invalid site ID.");
  await rm(path.join(sitesDir(root), `${id}.json`), { force: true });
}

// Searches every connected site for the passages that best match the question.
export async function searchSites(root, question, limit = 4) {
  const sites = (await listSites(root)).filter((site) => site.pages?.length);
  const sources = sites.flatMap((site) => site.pages.map((page) => ({ title: page.title || site.name, url: page.url, text: page.text, kind: page.kind, site: site.name })));
  return pickPassages(sources, question, limit, 700).map((item, rank) => ({ ...item, tag: `W${rank + 1}`, url: sources[item.index]?.url, site: sources[item.index]?.site }));
}
