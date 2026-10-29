import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertPublicUrl } from "./web-source.mjs";

// Reads pages that build themselves with JavaScript by opening them in the Edge or Chrome already installed on this computer.
const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge",
];

export function findBrowser() {
  return CANDIDATES.find((file) => file && existsSync(file)) || null;
}

const SKIP_TYPES = new Set(["image", "media", "font", "manifest", "texttrack", "ping"]);
const clip = (value, size) => String(value ?? "").slice(0, size);

export function makeRenderer({ lookup, timeoutMs = 40000, settleMs = 1200 } = {}) {
  let browser = null;
  let profile = null;
  let starting = null;
  const verdicts = new Map();

  // Every request the page makes (scripts, API calls, redirects) must also go to a public address.
  const allowed = async (address) => {
    let url;
    try { url = new URL(address); } catch { return false; }
    if (url.protocol === "data:" || url.protocol === "blob:" || url.protocol === "about:") return true;
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const key = `${url.protocol}//${url.hostname}`;
    if (!verdicts.has(key)) verdicts.set(key, assertPublicUrl(url.toString(), lookup).then(() => true, () => false));
    return verdicts.get(key);
  };

  const launch = async () => {
    const executablePath = findBrowser();
    if (!executablePath) throw new Error("No Edge or Chrome browser was found on this computer, so JavaScript-only pages cannot be read.");
    const { default: puppeteer } = await import("puppeteer-core");
    profile = await mkdtemp(path.join(os.tmpdir(), "reader-profile-"));
    browser = await puppeteer.launch({ executablePath, headless: true, userDataDir: profile, args: ["--disable-extensions", "--disable-gpu", "--mute-audio", "--no-first-run", "--disable-sync", "--disable-background-networking", "--disable-dev-shm-usage"] });
    browser.on("disconnected", () => { browser = null; });
    return browser;
  };

  const ensure = async () => {
    if (browser) return browser;
    starting ||= launch().finally(() => { starting = null; });
    return starting;
  };

  const close = async () => {
    const current = browser;
    browser = null;
    try { await current?.close(); } catch { /* already closed */ }
    if (profile) { await rm(profile, { recursive: true, force: true }).catch(() => {}); profile = null; }
  };

  const render = async (address) => {
    const start = await assertPublicUrl(address, lookup);
    const instance = await ensure();
    // A fresh private window per page: no cookies, no saved logins, nothing carried over.
    const context = await instance.createBrowserContext();
    const page = await context.newPage();
    try {
      await page.setUserAgent("Mozilla/5.0 (compatible; NISR-Track2-Investigation/1.0; analyst-added site)");
      await page.setRequestInterception(true);
      page.on("request", async (request) => {
        try {
          if (SKIP_TYPES.has(request.resourceType())) { await request.abort(); return; }
          if (await allowed(request.url())) await request.continue(); else await request.abort("blockedbyclient");
        } catch { /* the page was closed while deciding */ }
      });
      page.on("dialog", (dialog) => dialog.dismiss().catch(() => {}));
      let response = null;
      try { response = await page.goto(start.toString(), { waitUntil: "domcontentloaded", timeout: timeoutMs }); }
      catch (failure) { if (!/timeout/i.test(String(failure?.message))) throw failure; /* read whatever has loaded */ }
      if (response && response.status() >= 400) throw new Error(`The website answered with an error (${response.status()}).`);
      // Many apps keep polling forever, so "network idle" never comes. Wait instead until the text on screen stops changing.
      let last = -1;
      let steady = 0;
      for (let tick = 0; tick < 36 && steady < 3; tick += 1) {
        const size = await page.evaluate(() => document.body?.innerText?.length || 0).catch(() => 0);
        steady = size >= 200 && size === last ? steady + 1 : 0;
        last = size;
        await new Promise((resolve) => setTimeout(resolve, tick === 0 ? settleMs : 500));
      }
      const finalUrl = page.url();
      if (!(await allowed(finalUrl))) throw new Error("Only public websites can be added, not local or internal addresses.");
      const data = await page.evaluate(() => {
        // Links first: menus are removed from the text below but are still how a crawler finds the rest of the site.
        const links = [...document.querySelectorAll("a[href]")].map((anchor) => ({ href: anchor.href, label: (anchor.innerText || anchor.getAttribute("aria-label") || "").trim().slice(0, 100) }));
        document.querySelectorAll("script,style,noscript,svg,template,iframe,nav,footer").forEach((node) => node.remove());
        return { title: document.title || "", text: document.body?.innerText || "", links };
      });
      const text = data.text.replace(/[ \t\f\v]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      return { url: finalUrl, title: clip(data.title.trim(), 160), text, links: data.links.filter((link) => /^https?:/i.test(link.href)).slice(0, 400) };
    } finally {
      await context.close().catch(() => {});
    }
  };

  return { render, close, allowed };
}
