import React, { useCallback, useEffect, useRef, useState } from "react";
import { Activity, BookOpen, ChevronRight, ClipboardList, Database, FileText, Globe, Layers, LayoutGrid, Loader2, Paperclip, Sparkles, TrendingUp } from "lucide-react";
import { ACCEPTED_FILES, request, uploadFile } from "@/lib/investigationApi";
import { Sources } from "./Notebook";
import { STARTERS } from "./InvestigationChat";

function PaneTitle({ children, count }) {
  return <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-sub">{children}{count != null && <span className="rounded-full bg-canvas px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal tabular-nums">{count}</span>}</h2>;
}

// Left pane: everything the AI is allowed to read for this investigation.
export function SourcesPane({ id, ready, drawerOpen, refreshKey, onChanged, onOpenView, onOpenConnections }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(null);
  const load = useCallback(() => { request(`/sources/${id}`).then((value) => setSources(value.sources)).catch(() => {}).finally(() => setLoading(false)); }, [id]);
  useEffect(() => { setSources([]); setLoading(true); load(); }, [load, refreshKey]);
  // Re-read when the Connected websites drawer closes, so changes made there show up here.
  useEffect(() => { if (!drawerOpen) request("/connected").then(setConnected).catch(() => {}); }, [drawerOpen]);
  const platform = connected?.connections?.[0];
  const uploads = sources.filter((item) => item.kind === "upload");
  const websites = sources.filter((item) => item.kind !== "upload");
  const [sending, setSending] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const picker = useRef(null);
  const upload = async (list) => {
    setUploadError("");
    for (const file of [...list]) {
      setSending((previous) => [...previous, file.name]);
      try { setSources((await uploadFile(id, file)).sources); onChanged?.(); }
      catch (failure) { setUploadError(`${file.name}: ${failure.message}`); }
      finally { setSending((previous) => previous.filter((name) => name !== file.name)); }
    }
  };

  return <div className="space-y-5 p-4">
    <section>
      <PaneTitle>Survey evidence</PaneTitle>
      <ul className="mt-2 space-y-1.5">
        {[["EICV7 household survey", "NISR · 2023/24 · verified", "data"], ["Source register and limits", "What was checked, and what is missing", "data"]].map(([title, note, view]) => <li key={title}>
          <button type="button" disabled={!ready} onClick={() => onOpenView(view)} className="flex w-full items-center gap-2.5 rounded-lg border border-hairline bg-white p-2.5 text-left hover:border-brand/40 disabled:opacity-60"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#EAF7F0] text-[#147D4B]"><Database className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium text-ink">{title}</span><span className="block truncate text-[10.5px] text-sub">{note}</span></span><ChevronRight className="h-3.5 w-3.5 shrink-0 text-sub" /></button>
        </li>)}
      </ul>
    </section>

    <section onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files.length) upload(event.dataTransfer.files); }}>
      <div className="flex items-center justify-between"><PaneTitle count={loading ? null : uploads.length}>Files and images</PaneTitle><button type="button" onClick={() => picker.current?.click()} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"><Paperclip className="h-3 w-3" />Upload</button></div>
      <input ref={picker} type="file" multiple accept={ACCEPTED_FILES} className="sr-only" aria-label="Upload files" onChange={(event) => { if (event.target.files.length) upload(event.target.files); event.target.value = ""; }} />
      <p className="mb-2 mt-1 text-[11px] leading-relaxed text-sub">Images, PDF, Word, Excel, CSV, JSON or text, up to 12 MB. Drop them here or attach them in the chat. The AI reads each one.</p>
      {sending.map((name) => <p key={name} className="mb-1.5 flex items-center gap-2 rounded-lg border border-hairline bg-canvas/60 p-2.5 text-[11.5px] text-sub"><Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /><span className="min-w-0 truncate">Reading {name}…</span></p>)}
      {uploadError && <p role="alert" className="mb-1.5 rounded-md border border-red-200 bg-red-50 p-2.5 text-[11.5px] text-red-700">{uploadError}</p>}
      {uploads.length === 0 && sending.length === 0 && <p className="rounded-lg border border-dashed border-hairline p-3 text-center text-[11px] text-sub">No files yet</p>}
      <Sources id={id} sources={uploads} setSources={setSources} onChanged={onChanged} bare noForm />
    </section>

    <section>
      <PaneTitle count={loading ? null : websites.length}>Websites you added</PaneTitle>
      <p className="mb-2 mt-1 text-[11px] leading-relaxed text-sub">Paste a link to a page, PDF, CSV or Excel file. The AI cites it as [S1], [S2], labelled apart from survey figures.</p>
      <Sources id={id} sources={websites} setSources={setSources} onChanged={onChanged} bare />
    </section>

    <section>
      <div className="flex items-center justify-between"><PaneTitle count={connected ? 1 + connected.sites.length : null}>Connected sources</PaneTitle><button type="button" onClick={onOpenConnections} className="text-[11px] font-medium text-brand hover:underline">Manage</button></div>
      <ul className="mt-2 space-y-1.5">
        {platform && <li className="flex items-center gap-2.5 rounded-lg border border-hairline bg-white p-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-soft text-brand"><Database className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium text-ink">Rwanda Data Sharing Platform</span><span className="block truncate text-[10.5px] text-sub">data.gov.rw · {platform.datasets?.toLocaleString()} datasets</span></span><span className="h-2 w-2 shrink-0 rounded-full bg-[#12B76A]" title={platform.status} /></li>}
        {connected?.sites.map((site) => <li key={site.id} className="flex items-center gap-2.5 rounded-lg border border-hairline bg-white p-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-canvas text-brand"><Globe className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium text-ink">{site.name}</span><span className="block truncate text-[10.5px] text-sub">{site.status === "Ready" ? `${site.page_count} pages${site.file_count ? ` · ${site.file_count} files` : ""}` : site.status}</span></span><span className={`h-2 w-2 shrink-0 rounded-full ${site.status === "Ready" ? "bg-[#12B76A]" : site.status === "Crawling" ? "bg-brand" : "bg-[#F04438]"}`} title={site.status} /></li>)}
        {connected && connected.sites.length === 0 && <li className="rounded-lg border border-dashed border-hairline p-2.5 text-[11px] leading-relaxed text-sub">No other sites yet. Use Manage to connect a whole website.</li>}
      </ul>
    </section>
  </div>;
}

const TILES = [
  { key: "report", label: "AI report", note: "Written report with charts", icon: FileText, tone: "bg-brand-soft text-brand" },
  { key: "overview", label: "Findings", note: "Conclusion and key numbers", icon: LayoutGrid, tone: "bg-[#EAF7F0] text-[#147D4B]" },
  { key: "drivers", label: "Drivers", note: "What lines up with poverty", icon: TrendingUp, tone: "bg-[#EEF4FF] text-[#2F5BC9]" },
  { key: "compare", label: "Comparison", note: "Against Rwanda and peers", icon: Layers, tone: "bg-[#F4EBFF] text-[#7A3FC9]" },
  { key: "respond", label: "Requests", note: "Programme teams and review", icon: ClipboardList, tone: "bg-[#FFFAEB] text-[#B54708]" },
  { key: "notebook", label: "Case notebook", note: "Saved answers, organised", icon: BookOpen, tone: "bg-[#FFF1F3] text-[#C0314B]" },
  { key: "steps", label: "Investigation steps", note: "What the AI did", icon: Activity, tone: "bg-canvas text-sub" },
];

// Right pane: the things the investigation produced, each one opens in the centre or a drawer.
export function StudioPane({ ready, view, counts, onOpen }) {
  return <div className="p-4">
    <PaneTitle>Studio</PaneTitle>
    <div className="mt-2 grid grid-cols-2 gap-2">
      {TILES.map(({ key, label, note, icon: Icon, tone }) => {
        const off = !ready && key !== "steps";
        const count = counts[key];
        return <button key={key} type="button" disabled={off} onClick={() => onOpen(key)} aria-current={view === key ? "true" : undefined} className={`relative flex min-h-[92px] flex-col items-start rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${view === key ? "border-brand bg-brand-soft/40" : "border-hairline bg-white hover:border-brand/40"}`}>
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>
          <span className="mt-2 text-[12.5px] font-semibold text-ink">{label}</span>
          <span className="text-[10.5px] leading-snug text-sub">{note}</span>
          {count > 0 && <span className="absolute right-2.5 top-2.5 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">{count}</span>}
        </button>;
      })}
    </div>
    {!ready && <p className="mt-3 text-[11.5px] leading-relaxed text-sub">These unlock when the investigation finishes.</p>}
  </div>;
}

// Top of the conversation: a short summary and questions worth asking, like a notebook guide.
export function GuideCard({ district, lead, topics, onAsk }) {
  return <section aria-label="Notebook guide" className="rounded-2xl border border-hairline bg-canvas/50 p-4 sm:p-5">
    <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand"><Sparkles className="h-4 w-4" /></span><h2 className="text-[14px] font-semibold text-ink">{district} investigation</h2></div>
    {lead && <p className="mt-3 text-[13.5px] leading-[1.7] text-ink">{lead}</p>}
    {topics.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{topics.map((topic) => <span key={topic} className="rounded-full border border-hairline bg-white px-2.5 py-1 text-[11px] text-ink">{topic}</span>)}</div>}
    <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sub">Try asking</p>
    <div className="mt-1.5 flex flex-col gap-1.5">{STARTERS.map((text) => <button key={text} type="button" onClick={() => onAsk(text)} className="rounded-xl border border-hairline bg-white px-3 py-2 text-left text-[12px] text-ink hover:border-brand/40 hover:text-brand">{text}</button>)}</div>
  </section>;
}
