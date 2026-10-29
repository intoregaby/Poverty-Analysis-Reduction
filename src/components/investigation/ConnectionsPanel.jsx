import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Database, FileText, Globe, Link2, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import SidePanel from "./SidePanel";
import { request } from "@/lib/investigationApi";

const when = (value) => value ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kigali" }) : "";
const tone = { Ready: "bg-[#EAF7F0] text-[#147D4B]", Crawling: "bg-indigo-50 text-brand", Failed: "bg-red-50 text-red-700", Interrupted: "bg-amber-50 text-amber-700" };

export default function ConnectionsPanel({ onClose, onCount }) {
  const [data, setData] = useState(null);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { const value = await request("/connected"); setData(value); onCount?.(1 + value.sites.length); }
    catch (failure) { setError(failure.message); }
  }, [onCount]);
  useEffect(() => { load(); }, [load]);
  // While a site is being read, keep the progress fresh.
  useEffect(() => {
    if (!data?.sites?.some((site) => site.status === "Crawling")) return undefined;
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [data, load]);

  const act = async (job) => { setBusy(true); setError(""); try { await job(); await load(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } };
  const connect = (event) => { event.preventDefault(); if (!address.trim()) return; act(async () => { await request("/sites", { method: "POST", body: JSON.stringify({ url: address.trim() }) }); setAddress(""); }); };
  const platform = data?.connections?.[0];

  return <SidePanel title="Connected websites" subtitle="The AI searches all of these on every question" icon={Link2} onClose={onClose}>
    <div className="space-y-4 p-4">
      <p className="text-[12px] leading-relaxed text-sub">Connect a website once and the AI reads the whole site, including the PDFs, CSV and Excel files it links to. It then uses what it learned in every investigation, and cites the page it used.</p>

      <form onSubmit={connect} className="rounded-xl border border-hairline bg-white p-3">
        <label htmlFor="connect-site" className="text-[12px] font-medium text-ink">Connect a website</label>
        <div className="mt-2 flex gap-2"><input id="connect-site" type="url" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="https://www.minagri.gov.rw" className="h-10 min-w-0 flex-1 rounded-lg border border-hairline px-3 text-[12.5px] text-ink outline-none focus:border-brand/50" />
          <button type="submit" disabled={busy || !address.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-3 text-[12px] font-medium text-white hover:bg-[#524BE0] disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Connect</button></div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-sub">Reads up to 40 pages and 6 files, follows the site's robots.txt rules, and stays on that site. Pages that only appear through JavaScript are opened in a browser on this computer, which is slower. Sites that block automated readers are skipped.</p>
        {error && <p role="alert" className="mt-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-[11.5px] text-red-700"><AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />{error}</p>}
      </form>

      <section>
        <h3 className="text-[10.5px] font-medium uppercase tracking-wide text-sub">Built in</h3>
        <div className="mt-2 rounded-xl border border-hairline bg-white p-3">
          <div className="flex items-start gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Database className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><a href={platform?.url || "https://data.gov.rw/"} target="_blank" rel="noreferrer" className="text-[12.5px] font-medium text-ink hover:text-brand">Rwanda Data Sharing Platform</a>
              <p className="mt-0.5 text-[11px] text-sub">{platform ? `${platform.datasets.toLocaleString()} datasets with their data dictionaries · refreshed ${when(platform.fetched_at)}` : "Connecting…"}</p></div>
            {platform && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${platform.status === "Connected" ? tone.Ready : "bg-amber-50 text-amber-700"}`}>{platform.status}</span>}</div>
        </div>
      </section>

      <section>
        <h3 className="text-[10.5px] font-medium uppercase tracking-wide text-sub">Your websites ({data?.sites?.length ?? 0})</h3>
        {data && data.sites.length === 0 && <p className="mt-2 rounded-xl border border-dashed border-hairline bg-white p-4 text-center text-[12px] text-sub">No websites yet. Try statistics.gov.rw or a ministry site.</p>}
        <ul className="mt-2 space-y-2">{data?.sites?.map((site) => <li key={site.id} className="rounded-xl border border-hairline bg-white p-3">
          <div className="flex items-start gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canvas text-brand"><Globe className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><a href={site.start} target="_blank" rel="noreferrer" className="block truncate text-[12.5px] font-medium text-ink hover:text-brand">{site.name}</a>
              <p className="mt-0.5 text-[11px] text-sub">{site.status === "Crawling" ? `Reading the site… ${site.progress?.fetched || 0} pages so far` : site.status === "Ready" ? `${site.page_count} pages${site.file_count ? ` · ${site.file_count} files` : ""} · ${(site.characters / 1000).toFixed(0)}k characters · read ${when(site.crawled_at)}` : site.error || "Not finished"}</p></div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${tone[site.status] || tone.Failed}`}>{site.status === "Crawling" ? <Loader2 className="h-3 w-3 animate-spin" /> : site.status === "Ready" ? <CheckCircle2 className="h-3 w-3" /> : null}{site.status}</span></div>
          {site.status === "Ready" && site.truncated && <p className="mt-2 text-[10.5px] text-amber-700">The site is larger than the limit, so only part of it was read. Crawl again after connecting a more specific section.</p>}
          {site.status === "Ready" && site.errors?.length > 0 && <details className="mt-2 text-[10.5px] text-sub"><summary className="cursor-pointer">{site.errors.length} pages could not be read</summary><ul className="mt-1 space-y-1">{site.errors.slice(0, 6).map((item) => <li key={item.url} className="break-all"><FileText className="mr-1 inline h-3 w-3" />{item.url}: {item.message}</li>)}</ul></details>}
          <div className="mt-2.5 flex items-center gap-2">
            <button type="button" disabled={busy || site.status === "Crawling"} onClick={() => act(() => request(`/sites/${site.id}/refresh`, { method: "POST", body: "{}" }))} className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-[11.5px] font-medium text-ink hover:bg-canvas disabled:opacity-50"><RefreshCw className="h-3 w-3" />Crawl again</button>
            <button type="button" disabled={busy} onClick={() => act(() => request(`/sites/${site.id}`, { method: "DELETE" }))} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3 w-3" />Remove</button>
          </div>
        </li>)}</ul>
      </section>
    </div>
  </SidePanel>;
}
