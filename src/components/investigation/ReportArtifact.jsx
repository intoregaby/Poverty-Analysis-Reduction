import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ChevronRight, Copy, Download, FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import SidePanel from "./SidePanel";
import ReportChart from "./ReportCharts";
import Md from "./Markdown";
import { fallbackReport } from "./reportData";
import { REPORT_VERSION, SECTION_TITLES } from "@/lib/reportTemplate";
import { exportDecision } from "@/lib/exportPolicy";
import VerificationSection, { VerificationSummary } from "./VerificationSection";
import { downloadHtml, downloadMarkdown, downloadPdf, reportToMarkdown } from "./reportExport";

const WRITING_STEPS = ["Reading the verified findings", "Drafting the summary", "Explaining what lines up with the gap", "Choosing charts and checking figures"];
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Kigali" }) : "";

function Part({ number, title, children }) {
  return <section data-pdf-block className="px-6 pt-6"><h2 className="text-[15px] font-semibold tracking-tight text-ink"><span className="mr-1.5 text-brand">{number}.</span>{title}</h2><div className="mt-1.5">{children}</div></section>;
}
function Label({ children }) {
  return <h3 className="mb-0.5 mt-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sub first:mt-0">{children}</h3>;
}

function useReport(ai, result, district) {
  const current = ai.data?.report?.version === REPORT_VERSION ? ai.data.report : null;
  const report = current || (result ? fallbackReport(result, district) : null);
  return { report, automated: !current, outdated: Boolean(ai.data?.report) && !current };
}

function DownloadMenu({ onPdf, onHtml, onMarkdown, onCopy, busy, warning, disabled }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const items = [["PDF document", ".pdf", onPdf], ["Web page", ".html", onHtml], ["Markdown", ".md", onMarkdown]];
  return <div className="flex items-center gap-1.5" ref={ref}>
    <button type="button" disabled={disabled} title={disabled ? warning : undefined} onClick={async () => { await onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-white px-2.5 text-[11.5px] font-medium text-ink hover:bg-canvas disabled:opacity-60">{copied ? <Check className="h-3.5 w-3.5 text-[#147D4B]" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</button>
    <div className="relative">
      <button type="button" disabled={busy || disabled} title={disabled ? warning : undefined} onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-2.5 text-[11.5px] font-medium text-white hover:bg-[#524BE0] disabled:opacity-60">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Download</button>
      {open && !disabled && <div role="menu" className="absolute right-0 top-9 z-20 w-60 overflow-hidden rounded-lg border border-hairline bg-white py-1 shadow-[0_8px_24px_rgba(10,37,64,0.14)]">{warning && <p className="border-b border-hairline bg-red-50 px-3 py-2 text-[11px] leading-snug text-red-800">{warning}</p>}{items.map(([label, ext, action]) => <button key={ext} role="menuitem" type="button" onClick={() => { setOpen(false); action(); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] text-ink hover:bg-canvas">{label}<span className="text-[10.5px] text-sub">{ext}</span></button>)}</div>}
    </div>
  </div>;
}

export function ReportPanel({ ai, result, district, onClose }) {
  const { report, automated, outdated } = useReport(ai, result, district);
  const docRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  if (!report) return null;
  const unmatched = automated ? [] : ai.data?.unmatched_numbers || [];
  const note = automated ? "Automated summary built from the verified findings. The AI writer was unavailable." : "Written by AI from verified survey calculations. Check the source before acting.";
  const footer = `${note} Source: NISR EICV7 2023/24. Associations do not establish causes or programme effects.`;
  const file = `${district}-investigation-report`;
  const decision = exportDecision({ ...report, automated });
  const watermarkNote = decision.mode === "restricted_draft"
    ? `${decision.watermark}.${decision.blockers.length ? ` Checks not passed: ${decision.blockers.join(", ")}.` : ""}`
    : decision.reason;
  const run = (job) => async () => { setExporting(true); setExportError(""); try { await job(); } catch (failure) { setExportError(failure.message || "The download failed."); } finally { setExporting(false); } };

  return <SidePanel wide title={report.title} subtitle={automated ? "Automated summary" : `AI report · ${dateLabel(ai.data?.generated_at)}`} icon={FileText} onClose={onClose}
    actions={<DownloadMenu busy={exporting} disabled={decision.mode !== "restricted_draft"} onPdf={run(() => downloadPdf(docRef.current, file, decision))} onHtml={run(async () => downloadHtml(docRef.current, report.title, file, decision))} onMarkdown={run(async () => downloadMarkdown(report, { note, footer, decision }, file))} warning={watermarkNote} onCopy={() => navigator.clipboard?.writeText(reportToMarkdown(report, { note, footer })).catch(() => {})} />}>
    <div className="bg-canvas p-3 sm:p-4">
      {exportError && <p role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-[11.5px] text-red-700"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{exportError}</p>}
      {outdated && <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11.5px] text-amber-800"><span>This saved report uses the older layout. The new layout is shown from the verified findings.</span><button type="button" onClick={ai.regenerate} className="inline-flex items-center gap-1 font-medium underline"><RefreshCw className="h-3 w-3" />Write a new AI version</button></div>}
      {ai.status === "error" && <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11.5px] text-amber-800"><span>{ai.error}</span><button type="button" onClick={ai.regenerate} className="inline-flex items-center gap-1 font-medium underline"><RefreshCw className="h-3 w-3" />Try AI again</button></div>}
      <div className="mx-auto mb-3 max-w-[720px]"><VerificationSummary section={report.verification} /></div>
      <article ref={docRef} className="mx-auto max-w-[720px] rounded-xl border border-hairline bg-white">
        <header data-pdf-block className="border-b border-hairline px-6 pb-5 pt-6">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-brand"><Sparkles className="h-3 w-3" />District investigation report</p>
          <h1 className="mt-2 text-[22px] font-semibold leading-tight tracking-tight text-ink">{report.title}</h1>
          {report.subtitle && <p className="mt-1 text-[12.5px] text-sub">{report.subtitle}</p>}
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-[10.5px] text-sub sm:grid-cols-2"><div><dt className="inline font-medium text-ink">Prepared by: </dt><dd className="inline">{report.author}</dd></div><div><dt className="inline font-medium text-ink">Date: </dt><dd className="inline">{dateLabel(report.date)}</dd></div><div><dt className="inline font-medium text-ink">Data: </dt><dd className="inline">NISR EICV7 2023/24</dd></div><div><dt className="inline font-medium text-ink">Written by: </dt><dd className="inline">{automated ? "Automated summary" : "AI, from verified calculations"}</dd></div></dl>
        </header>
        <nav data-pdf-block aria-label="Contents" className="px-6 pt-4"><ol className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-sub">{SECTION_TITLES.map((title, index) => <li key={title}>{index + 1}. {title}</li>)}</ol></nav>

        <Part number={1} title={SECTION_TITLES[0]}>
          <Label>Objective</Label><Md>{report.executive_summary.objective}</Md>
          {report.executive_summary.evidence_check && <><Label>Evidence check</Label><p className="text-[12px] leading-relaxed text-ink">{report.executive_summary.evidence_check}</p></>}
          <Label>Main points</Label><ul className="mt-1 list-disc space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-ink marker:text-brand">{report.executive_summary.main_points.map((item) => <li key={item}><Md>{item}</Md></li>)}</ul>
          {report.key_numbers.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{report.key_numbers.map((item) => <div key={item.label} className="rounded-lg border border-hairline bg-canvas/60 p-3"><p className="break-words text-[10.5px] leading-snug text-sub">{item.label}</p><p className="mt-1.5 text-[20px] font-semibold leading-none tabular-nums text-ink">{item.value}</p>{item.context && <p className="mt-1.5 text-[10px] leading-snug text-sub">{item.context}</p>}</div>)}</div>}
          {report.conclusion.next_steps.length > 0 && <><Label>Next checks</Label><ul className="mt-1 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-ink marker:text-brand">{report.conclusion.next_steps.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></>}
        </Part>

        <Part number={2} title={SECTION_TITLES[1]}>
          <Label>Background</Label><Md>{report.introduction.background}</Md>
          <Label>Questions this report asks</Label><ul className="mt-1 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-ink">{report.introduction.questions.map((item) => <li key={item}>{item}</li>)}</ul>
          <Label>Scope and limits</Label><ul className="mt-1 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-ink marker:text-amber-500">{report.introduction.scope.map((item) => <li key={item}>{item}</li>)}</ul>
        </Part>

        <Part number={3} title={SECTION_TITLES[2]}>
          <Label>Data used for the figures in this report</Label><ul className="mt-1 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-ink">{report.methodology.data_sources.filter((item) => item.role !== "available").map((item) => <li key={item.text}>{item.text}{item.file && <span className="block break-words text-[10.5px] text-sub">File: {item.file}</span>}</li>)}</ul>
          {report.methodology.data_sources.some((item) => item.role === "available") && <><Label>Also available to the engine, but not used for these figures</Label><ul className="mt-1 list-disc space-y-1 pl-5 text-[11.5px] leading-relaxed text-sub">{report.methodology.data_sources.filter((item) => item.role === "available").map((item) => <li key={item.text}>{item.text}{item.file && <span className="block break-words text-[10.5px]">File: {item.file}</span>}</li>)}</ul></>}
          <Label>How households were chosen and counted</Label><ul className="mt-1 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-ink">{report.methodology.sampling.map((item) => <li key={item}>{item}</li>)}</ul>
          <Label>Tools and methods</Label><ul className="mt-1 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-ink">{report.methodology.tools.map((item) => <li key={item}>{item}</li>)}</ul>
        </Part>

        <Part number={4} title={SECTION_TITLES[3]}>
          {report.results.sections.map((section) => <div key={section.heading} className="mt-3 first:mt-0"><h3 className="text-[13px] font-semibold text-ink">{section.heading}</h3><div className="mt-1"><Md>{section.body}</Md></div>{section.chart && <ReportChart kind={section.chart} result={result} />}</div>)}
          {report.results.how_sure && <><Label>How sure can we be?</Label><Md>{report.results.how_sure}</Md></>}
        </Part>

        <Part number={5} title={SECTION_TITLES[4]}>
          <VerificationSection section={report.verification} />
        </Part>

        <Part number={6} title={SECTION_TITLES[5]}>
          <Label>What the numbers mean</Label><Md>{report.discussion.interpretation}</Md>
          {report.discussion.comparison && <><Label>How this compares</Label><Md>{report.discussion.comparison}</Md></>}
          {report.discussion.risks.length > 0 && <><Label>Risks and surprises</Label><ul className="mt-1 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-ink marker:text-amber-500">{report.discussion.risks.map((item) => <li key={item}>{item}</li>)}</ul></>}
        </Part>

        <Part number={7} title={SECTION_TITLES[6]}>
          <Label>Conclusion</Label><Md>{report.conclusion.conclusion}</Md>
          {report.conclusion.options.length > 0 && <><Label>Options to evaluate</Label><p className="text-[11px] text-sub">These are ideas to research. Whether they would work here is not established.</p><div className="mt-2 space-y-2">{report.conclusion.options.map((item) => <div key={item.title} className="rounded-lg border border-hairline p-3"><h4 className="text-[12.5px] font-semibold text-ink">{item.title}</h4><p className="mt-1 text-[12px] leading-relaxed text-ink">{item.rationale}</p>{item.evidence_level && <p className="mt-1.5 text-[11px] text-sub"><strong className="text-ink">Evidence:</strong> {item.evidence_level}</p>}{item.check_first && <p className="mt-1 text-[11px] text-sub"><strong className="text-ink">Check first:</strong> {item.check_first}</p>}</div>)}</div></>}
          {report.conclusion.next_steps.length > 0 && <><Label>Next steps</Label><ol className="mt-1 list-decimal space-y-1.5 pl-5 text-[12px] leading-relaxed text-ink marker:text-brand">{report.conclusion.next_steps.map((item) => <li key={item}>{item}</li>)}</ol></>}
        </Part>

        <Part number={8} title={SECTION_TITLES[7]}>
          {report.appendices.glossary.length > 0 && <><Label>Words explained</Label><dl className="mt-1 space-y-1.5 text-[12px] leading-relaxed">{report.appendices.glossary.map((item) => <div key={item.term}><dt className="inline font-semibold text-ink">{item.term}: </dt><dd className="inline text-ink">{item.meaning}.</dd></div>)}</dl></>}
          {report.appendices.references.length > 0 && <><Label>References</Label><ul className="mt-1 list-disc space-y-1 pl-5 text-[11px] leading-relaxed text-sub">{report.appendices.references.map((item) => <li key={item.url} className="break-words"><a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">{item.title}</a>, {item.publisher}{item.period ? ` (${item.period})` : ""}</li>)}</ul></>}
        </Part>

        <footer data-pdf-block className="mt-6 border-t border-hairline px-6 py-4 text-[10.5px] leading-relaxed text-sub">{footer}{unmatched.length > 0 && <span data-export-hide className="mt-2 block rounded-md bg-amber-50 p-2 text-amber-800">Check these figures against the data tables: {unmatched.join(", ")}. They were not found in the verified calculations.</span>}</footer>
      </article>
    </div>
  </SidePanel>;
}

// The card that sits in the conversation. Opens the report in the right-hand panel.
export default function ReportArtifact({ ai, district, active, onOpen }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (ai.status !== "writing") return undefined;
    const timer = window.setInterval(() => setStep((value) => (value + 1) % WRITING_STEPS.length), 2600);
    return () => window.clearInterval(timer);
  }, [ai.status]);
  const writing = ai.status === "writing";
  const ready = ai.status === "ready";
  const failed = ai.status === "error";
  const title = (ai.data?.report?.version === REPORT_VERSION && ai.data.report.title) || `${district}: district poverty investigation`;
  const none = ai.status === "none";
  const usable = ready || failed || none;

  return <div className={`group flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left transition-colors ${active ? "border-brand/50 shadow-[0_0_0_3px_rgba(99,91,255,0.08)]" : "border-hairline hover:border-brand/30"}`}>
    <button type="button" onClick={onOpen} disabled={!usable} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-brand" aria-label={usable ? `Open report: ${title}` : "Report is being written"}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${failed ? "bg-amber-50 text-amber-700" : "bg-brand-soft text-brand"}`}>{writing ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : failed ? <AlertCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-ink">{writing ? "Writing your report…" : title}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-sub" role="status">{writing ? `${WRITING_STEPS[step]}…` : failed ? "AI writer unavailable. Open the automated summary." : none ? "Automated summary ready. Nothing has been sent to an AI provider." : `Report · ${ai.data?.report?.version === REPORT_VERSION ? "Written by AI" : "Automated"} · charts included`}</span>
      </span>
      {usable && <ChevronRight className="h-4 w-4 shrink-0 text-sub transition-transform group-hover:translate-x-0.5" />}
    </button>
    {none && <button type="button" onClick={ai.regenerate} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-brand px-2.5 text-[11.5px] font-medium text-white hover:bg-[#524BE0]"><Sparkles className="h-3.5 w-3.5" />Write AI version</button>}
    {failed && <button type="button" onClick={ai.regenerate} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-hairline px-2.5 text-[11.5px] font-medium text-ink hover:bg-canvas"><RefreshCw className="h-3.5 w-3.5" />Retry</button>}
    {ready && <button type="button" onClick={ai.regenerate} title="Write a new version" aria-label="Write a new version of the report" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-sub hover:bg-canvas hover:text-ink"><RefreshCw className="h-3.5 w-3.5" /></button>}
  </div>;
}
