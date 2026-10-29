import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, BookOpen, CircleHelp, ClipboardList, Download, ExternalLink, Globe, ListChecks, Loader2, MessageSquareText, Plus, RefreshCw, Sparkles, StickyNote, Trash2 } from "lucide-react";
import { fileSize, request } from "@/lib/investigationApi";
import { downloadText } from "./reportExport";

const when = (value) => value ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kigali" }) : "";
const label = (value) => String(value || "").replaceAll("_", " ");

export function notebookToMarkdown(district, organized, entries, decisions, sources = []) {
  const lines = [`# Case notebook: ${district}`, ""];
  if (organized) {
    const n = organized.notebook;
    lines.push(`_Organised by AI on ${when(organized.generated_at)}. Source: NISR EICV7 2023/24._`, "", "## Summary", "", n.summary, "", "## Key facts", "", ...n.key_facts.map((item) => `- **${item.fact}** ${item.why_it_matters}`), "");
    if (n.programme_reports?.length) lines.push("## Reported by programme teams (unverified field reports, sample data)", "", ...n.programme_reports.flatMap((item) => [`**${item.date}, ${item.team}, ${item.by}:** ${item.request}`, "", item.report, ""]));
    if (n.answered.length) lines.push("## Questions answered", "", ...n.answered.flatMap((item) => [`**${item.question}**`, "", item.answer, ""]));
    if (n.decisions.length) lines.push("## Review decisions", "", ...n.decisions.map((item) => `- **${item.decision}:** ${item.note}`), "");
    if (n.open_questions.length) lines.push("## Open questions", "", ...n.open_questions.map((item) => `- ${item}`), "");
    if (n.next_steps.length) lines.push("## Next steps", "", ...n.next_steps.map((item) => `- ${item}`), "");
    if (n.changes?.length) lines.push("## What changed in the latest update", "", ...n.changes.map((item) => `- ${item}`), "");
  } else lines.push("_Not organised yet._", "");
  if (sources.length) lines.push("## Websites added (third-party, not NISR-verified)", "", ...sources.map((item) => `- [${item.tag}] [${item.title}](${item.url})`), "");
  if (entries.length) lines.push("## Saved questions and answers", "", ...entries.flatMap((item) => [`**${item.question}** (${when(item.at)})`, "", item.answer, ""]));
  if (decisions.length) lines.push("## Analyst review notes", "", ...decisions.map((item) => `- ${label(item.decision)}: ${item.note} (${when(item.at)})`), "");
  lines.push("---", "Associations in survey data do not establish causes or programme effects.");
  return lines.join("\n");
}

function Section({ icon: Icon, title, count, children }) {
  return <section className="rounded-xl border border-hairline bg-white p-4 sm:p-5"><h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink"><Icon className="h-4 w-4 text-brand" />{title}{count != null && <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-normal tabular-nums text-sub">{count}</span>}</h3><div className="mt-3">{children}</div></section>;
}


function kindLabel(source) {
  if (source.kind === "upload") return `${source.fileKind === "image" ? "Image" : source.fileKind === "xlsx" ? "Excel" : source.fileKind === "txt" ? "Text" : source.fileKind.toUpperCase()}${source.pages ? ` · ${source.pages} pages` : ""} · ${fileSize(source.size)}`;
  if (source.kind === "catalog") return `Dataset catalogue · ${source.rows?.toLocaleString() || "?"} datasets`;
  if (source.kind === "pdf") return `PDF · ${source.pages || "?"} pages`;
  if (["csv", "json", "xlsx"].includes(source.kind)) return `${source.kind === "xlsx" ? "Excel" : source.kind.toUpperCase()} table${source.rows ? ` · ${source.rows.toLocaleString()} rows` : ""}`;
  return "Web page";
}

export function Sources({ id, sources, setSources, bare = false, onChanged, noForm = false }) {
  const [address, setAddress] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(null);
  const addAddress = async (link) => {
    if (!link.trim() || adding) return;
    setAdding(true); setError("");
    try { const value = await request(`/sources/${id}`, { method: "POST", body: JSON.stringify({ url: link.trim() }) }); setSources(value.sources); setAddress(""); onChanged?.(); }
    catch (failure) { setError(failure.message); } finally { setAdding(false); }
  };
  const add = (event) => { event.preventDefault(); addAddress(address); };
  const remove = async (sourceId) => {
    setRemoving(sourceId); setError("");
    try { setSources((await request(`/sources/${id}/${sourceId}`, { method: "DELETE" })).sources); onChanged?.(); }
    catch (failure) { setError(failure.message); } finally { setRemoving(null); }
  };
  return <section className={bare ? "" : "rounded-xl border border-hairline bg-white p-4 sm:p-5"}>
    {!bare && <><h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink"><Globe className="h-4 w-4 text-brand" />Websites you added<span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-normal tabular-nums text-sub">{sources.length}</span></h3>
    <p className="mt-1 text-[11.5px] leading-relaxed text-sub">The AI reads each page, PDF report or data file (CSV, JSON, Excel) and can use it when you ask questions, citing it as [S1], [S2]. Web pages are third-party and are not NISR-verified, so they are always labelled separately.</p></>}
    {!noForm && <form onSubmit={add} className={`${bare ? "rounded-xl border border-hairline bg-white p-1.5 focus-within:border-brand/50" : "mt-3"} flex items-center gap-2`}>
      <input type="url" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="https://… a web page, PDF, CSV, JSON or Excel link" aria-label="Website address" className={bare ? "h-8 min-w-0 flex-1 bg-transparent px-2 text-[12px] text-ink outline-none" : "h-10 min-w-0 flex-1 rounded-lg border border-hairline bg-white px-3 text-[12.5px] text-ink outline-none focus:border-brand/50"} />
      <button type="submit" disabled={adding || !address.trim()} aria-label="Add website" className={bare ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-white hover:bg-[#524BE0] disabled:opacity-40" : "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-[12px] font-medium text-white hover:bg-[#524BE0] disabled:opacity-50"}>{adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}{!bare && (adding ? "Reading…" : "Add")}</button>
    </form>}
    {error && <p role="alert" className="mt-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-[11.5px] text-red-700"><AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />{error}</p>}
    {sources.length > 0 && <ul className="mt-3 space-y-2">{sources.map((source) => <li key={source.id} className="rounded-lg border border-hairline p-3">
      <div className="flex items-start gap-2.5">{source.fileKind === "image" ? <a href={source.url} target="_blank" rel="noreferrer" className="shrink-0"><img src={source.url} alt="" className="h-10 w-10 rounded-md border border-hairline object-cover" /></a> : null}<span className="mt-0.5 shrink-0 rounded-md bg-brand-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-brand">{source.tag}</span>
        <div className="min-w-0 flex-1"><a href={source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-[12.5px] font-medium text-ink hover:text-brand"><span className="truncate">{source.title}</span><ExternalLink className="h-3 w-3 shrink-0 text-sub" /></a><p className="truncate text-[10.5px] text-sub">{kindLabel(source)} · {source.kind === "upload" ? "uploaded" : new URL(source.url).hostname} · added {when(source.added_at)}</p></div>
        <button type="button" onClick={() => remove(source.id)} disabled={removing === source.id} aria-label={`Remove ${source.title}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-sub hover:bg-red-50 hover:text-red-700 disabled:opacity-50">{removing === source.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button></div>
      {source.truncated && <p className="mt-2 text-[10.5px] text-amber-700">Only the first part of this file was read because it is very large.</p>}
      {source.files?.length > 0 && <div className="mt-2 rounded-md bg-canvas/70 p-2.5"><p className="text-[11px] font-medium text-ink">Files found on this page</p><ul className="mt-1.5 space-y-1">{source.files.filter((file) => !sources.some((item) => item.url === file.url)).map((file) => <li key={file.url} className="flex items-center gap-2 text-[11px]"><span className="min-w-0 flex-1 truncate text-sub" title={file.url}>{file.label}</span><button type="button" disabled={adding} onClick={() => addAddress(file.url)} className="shrink-0 rounded-md border border-hairline bg-white px-2 py-1 font-medium text-brand hover:bg-brand-soft disabled:opacity-50">Add</button></li>)}</ul></div>}
      {source.analysis_error ? <p className="mt-2 rounded-md bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-800">Saved, but the AI could not read it: {source.analysis_error}</p> : source.summary ? <details className="mt-2 text-[11.5px]"><summary className="cursor-pointer font-medium text-ink">What the AI took from this page</summary><div className="mt-1.5 whitespace-pre-wrap leading-relaxed text-sub">{source.summary.replace(/\*\*/g, "")}</div></details> : <p className="mt-2 text-[11px] text-amber-700">Saved, but the AI summary could not be written. It can still answer from the page text.</p>}
    </li>)}</ul>}
  </section>;
}

export default function Notebook({ id, district, findings, refreshKey, onCount, hideSources = false }) {
  const [data, setData] = useState(null);
  const [sources, setSources] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = useRef(id);

  const load = useCallback(async () => {
    try { const [value, web] = await Promise.all([request(`/notebook/${id}`), request(`/sources/${id}`)]); if (current.current === id) { setData(value); setSources(web.sources); onCount?.(value.entries.length + value.decisions.length); } }
    catch (failure) { if (current.current === id) setError(failure.message); }
  }, [id, onCount]);
  useEffect(() => { current.current = id; setData(null); setSources([]); setError(""); load(); }, [id, refreshKey, load]);

  const organize = async () => {
    setBusy(true); setError("");
    try { const value = await request(`/notebook/${id}/organize`, { method: "POST", body: JSON.stringify({ programme_findings: findings }) }); if (current.current === id) setData(value); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };

  if (!data) return error ? <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p> : <p className="text-[12px] text-sub"><Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" />Opening the notebook…</p>;

  const { organized, entries, decisions } = data;
  const n = organized?.notebook;
  const fresh = organized ? Math.max(0, entries.length - organized.based_on.questions) + Math.max(0, decisions.length - organized.based_on.notes) + Math.max(0, sources.length - (organized.based_on.sources || 0)) : entries.length + decisions.length + sources.length;
  const empty = !entries.length && !decisions.length && !sources.length;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-white p-4">
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><BookOpen className="h-5 w-5" /></span>
        <div className="min-w-0"><h2 className="text-[14px] font-semibold text-ink">Case notebook · {district}</h2>
          <p className="mt-0.5 text-[11.5px] text-sub">{organized ? `Organised by AI ${when(organized.generated_at)}` : "Not organised yet"} · {entries.length} saved {entries.length === 1 ? "question" : "questions"} · {decisions.length} review {decisions.length === 1 ? "note" : "notes"} · {sources.length} {sources.length === 1 ? "website" : "websites"}{organized && fresh > 0 ? ` · ${fresh} new since` : ""}</p></div></div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => downloadText(notebookToMarkdown(district, organized, entries, decisions, sources), `${district.toLowerCase()}-case-notebook.md`)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-hairline bg-white px-3 text-[12px] font-medium text-ink hover:bg-canvas"><Download className="h-3.5 w-3.5" />Markdown</button>
        <button type="button" onClick={organize} disabled={busy || empty} title={empty ? "Ask the AI a question or save a review note first" : undefined} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-[12px] font-medium text-white hover:bg-[#524BE0] disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{busy ? "Organising…" : organized ? "Update with AI" : "Organise with AI"}</button>
      </div>
    </div>
    {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700"><AlertCircle className="mt-px h-4 w-4 shrink-0" />{error}</p>}

    {!hideSources && <Sources id={id} sources={sources} setSources={setSources} />}

    {!organized && <div className="rounded-xl border border-dashed border-hairline bg-white px-5 py-10 text-center"><BookOpen className="mx-auto h-7 w-7 text-sub/50" /><p className="mt-2 text-[13px] font-medium text-ink">{empty ? "Nothing saved yet" : "Ready to organise"}</p><p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-sub">{empty ? "Every question you ask the AI analyst and every review note you save is kept here automatically. Then the AI can turn it into a clean case file." : "The AI will merge your questions, its answers and your review notes into a summary, key facts, decisions, open questions and next steps."}</p></div>}

    {n && <>
      <section className="rounded-xl border border-brand/20 bg-brand-soft/40 p-4 sm:p-5"><p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-brand">Where things stand</p><p className="mt-1.5 text-[14px] leading-[1.7] text-ink">{n.summary}</p></section>
      {n.changes?.length > 0 && <section className="rounded-xl border border-hairline bg-white p-4 sm:p-5"><h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink"><RefreshCw className="h-4 w-4 text-brand" />What changed in this update<span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-normal tabular-nums text-sub">{n.changes.length}</span></h3><ul className="mt-3 space-y-1.5">{n.changes.map((item) => <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-ink"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{item}</li>)}</ul></section>}
      {organized.unmatched_numbers?.length > 0 && <p className="rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800">Check these figures against the data: {organized.unmatched_numbers.join(", ")}. They were not found in the verified calculations or saved answers.</p>}
      <Section icon={ListChecks} title="Key facts" count={n.key_facts.length}><div className="grid gap-2.5 md:grid-cols-2">{n.key_facts.map((item) => <article key={item.fact} className="rounded-lg bg-canvas/70 p-3"><p className="text-[12.5px] font-medium leading-relaxed text-ink">{item.fact}</p>{item.why_it_matters && <p className="mt-1.5 text-[11.5px] leading-relaxed text-sub">{item.why_it_matters}</p>}</article>)}</div></Section>
      {n.programme_reports?.length > 0 && <section className="rounded-xl border border-[#FEDF89] bg-[#FFFAEB]/50 p-4 sm:p-5"><h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink"><ClipboardList className="h-4 w-4 text-[#B54708]" />Reported by programme teams<span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-normal tabular-nums text-sub">{n.programme_reports.length}</span><span className="rounded-full border border-[#FEDF89] bg-white px-2 py-0.5 text-[10px] font-medium text-[#B54708]">Unverified field reports · sample data</span></h3><ul className="mt-3 space-y-2.5">{n.programme_reports.map((item) => <li key={`${item.date}${item.request}`} className="rounded-lg bg-white p-3"><p className="text-[10.5px] text-sub">{item.date} · {item.team} · {item.by}</p><p className="mt-0.5 text-[12px] font-medium text-ink">{item.request}</p><p className="mt-1 text-[12.5px] leading-relaxed text-ink">{item.report}</p></li>)}</ul><p className="mt-2 text-[10.5px] text-sub">Copied exactly as the programme team wrote them. They are kept apart from the survey figures and never change them.</p></section>}
      {n.answered.length > 0 && <Section icon={MessageSquareText} title="Questions answered" count={n.answered.length}><div className="divide-y divide-hairline">{n.answered.map((item) => <div key={item.question} className="py-3 first:pt-0 last:pb-0"><p className="text-[12.5px] font-semibold text-ink">{item.question}</p><p className="mt-1 text-[12.5px] leading-[1.65] text-ink">{item.answer}</p></div>)}</div></Section>}
      <div className="grid gap-4 lg:grid-cols-2">
        {n.decisions.length > 0 && <Section icon={StickyNote} title="Review decisions" count={n.decisions.length}><ul className="space-y-2">{n.decisions.map((item) => <li key={`${item.decision}${item.note}`} className="rounded-lg bg-canvas/70 p-2.5 text-[12px]"><span className="font-medium capitalize text-ink">{item.decision}</span><p className="mt-0.5 leading-relaxed text-sub">{item.note}</p></li>)}</ul></Section>}
        {n.open_questions.length > 0 && <Section icon={CircleHelp} title="Still open" count={n.open_questions.length}><ul className="space-y-2">{n.open_questions.map((item) => <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-ink"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />{item}</li>)}</ul></Section>}
      </div>
      {n.next_steps.length > 0 && <Section icon={ListChecks} title="Next steps" count={n.next_steps.length}><ol className="space-y-2">{n.next_steps.map((item, index) => <li key={item} className="flex gap-3 text-[12.5px] leading-relaxed text-ink"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[10.5px] font-semibold text-brand">{index + 1}</span>{item}</li>)}</ol></Section>}
    </>}

    {(entries.length > 0 || decisions.length > 0) && <details className="rounded-xl border border-hairline bg-white p-4 text-[12px]"><summary className="cursor-pointer text-[12.5px] font-medium text-ink">Saved log ({entries.length + decisions.length})</summary>
      <ul className="mt-3 space-y-3">{entries.map((item) => <li key={item.id} className="border-l-2 border-brand/25 pl-3"><p className="text-[10.5px] text-sub">{when(item.at)} · question</p><p className="mt-0.5 font-medium text-ink">{item.question}</p><p className="mt-1 whitespace-pre-wrap leading-relaxed text-sub">{item.answer}</p></li>)}{decisions.map((item) => <li key={item.id} className="border-l-2 border-amber-300 pl-3"><p className="text-[10.5px] text-sub">{when(item.at)} · review note · {label(item.decision)}</p><p className="mt-0.5 leading-relaxed text-ink">{item.note}</p></li>)}</ul></details>}
  </div>;
}
