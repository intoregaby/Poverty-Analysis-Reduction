import React, { useEffect, useState } from "react";
import { AlertCircle, Check, ChevronDown, Database, FileSearch, ListChecks, Loader2, RefreshCw, ShieldCheck, Layers } from "lucide-react";
import SidePanel from "./SidePanel";
import Status from "./InvestigationStatus";
import { clock, formatDuration, isFinished, stageSummary, stageTimes } from "./stageInfo";

export default function TaskPanel({ id, district, state, stages, busy, onResume, onClose }) {
  const events = state?.recent_events || [];
  const times = stageTimes(events);
  const done = ["Completed", "Warning"].includes(state?.status);
  const failed = state?.status === "Failed";
  const finished = stages.filter(isFinished).length;
  const runningName = stages.find((stage) => stage.status === "Running")?.name;
  const [open, setOpen] = useState(() => new Set());
  useEffect(() => { if (runningName) setOpen((previous) => new Set(previous).add(runningName)); }, [runningName]);
  const toggle = (name) => setOpen((previous) => { const next = new Set(previous); if (next.has(name)) next.delete(name); else next.add(name); return next; });
  const counts = [{ label: "Files", value: state?.counts?.files_discovered, icon: FileSearch }, { label: "Tables", value: state?.counts?.tables_inventoried, icon: Layers }, { label: "Variables", value: state?.counts?.variables_inventoried, icon: Database }, { label: "Sources", value: state?.counts?.sources_verified, icon: ShieldCheck }];

  return <SidePanel title="Investigation tasks" subtitle={`${state?.district || district} · ${finished} of ${stages.length} done`} icon={ListChecks} onClose={onClose} actions={<Status value={state?.status} />}>
    <div className="px-4 pt-4">
      <div role="progressbar" aria-label="Steps finished" aria-valuemin={0} aria-valuemax={stages.length} aria-valuenow={finished} className="flex gap-1">{stages.map((stage) => <span key={stage.name} className={`h-1.5 flex-1 rounded-full ${isFinished(stage) ? "bg-brand" : stage.status === "Running" ? "animate-pulse bg-brand/40" : stage.status === "Failed" ? "bg-red-400" : "bg-[#E8ECF3]"}`} />)}</div>
      {state?.interrupted && <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11.5px] text-amber-800">The worker stopped sending its heartbeat. Retry to continue from saved checkpoints.</p>}
      {failed && <button type="button" onClick={onResume} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3 py-1.5 text-[11.5px] font-medium text-ink hover:bg-canvas disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Retry failed step</button>}
    </div>
    <ol aria-label="Investigation steps" className="mt-3 px-2 pb-2">
      {stages.map((stage, index) => {
        const active = stage.status === "Running";
        const bad = stage.status === "Failed";
        const warn = stage.status === "Warning";
        const finishedStage = isFinished(stage);
        const span = times[stage.name];
        const length = span?.start && (span.end || active) ? (span.end || Date.now()) - span.start : null;
        const log = events.filter((event) => event.stage === stage.name);
        const notes = [...(stage.errors || []).map((text) => ({ text, tone: "text-red-700" })), ...(stage.warnings || []).map((text) => ({ text, tone: "text-amber-700" })), ...(stage.notes || []).map((text) => ({ text, tone: "text-sub" }))];
        const expandable = log.length > 0 || notes.length > 0;
        const isOpen = open.has(stage.name);
        return <li key={stage.name} aria-current={active ? "step" : undefined}>
          <button type="button" disabled={!expandable} onClick={() => toggle(stage.name)} aria-expanded={expandable ? isOpen : undefined} className={`flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left ${expandable ? "hover:bg-canvas" : "cursor-default"} ${active ? "bg-brand-soft/50" : ""}`}>
            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold ${bad ? "border-red-200 bg-red-50 text-red-600" : warn ? "border-amber-200 bg-amber-50 text-amber-700" : finishedStage ? "border-brand bg-brand text-white" : active ? "border-brand/40 bg-white text-brand" : "border-hairline bg-white text-sub"}`}>
              {bad || warn ? <AlertCircle className="h-3 w-3" /> : finishedStage ? <Check className="h-3 w-3" strokeWidth={3} /> : active ? <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" /> : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2"><span className={`text-[12.5px] font-medium ${active ? "text-brand" : finishedStage ? "text-ink" : "text-sub"}`}>{stage.name}</span><span className="flex items-center gap-1.5 text-[10.5px] tabular-nums text-sub">{length != null && formatDuration(length)}{expandable && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />}</span></span>
              <span className="mt-0.5 block break-words text-[11.5px] leading-relaxed text-sub">{stageSummary(stage, state?.counts)}</span>
            </span>
          </button>
          {isOpen && expandable && <div className="ml-[22px] mb-1 border-l border-hairline pl-5 pr-2 text-[11px]">
            {log.length > 0 && <ul className="space-y-2 py-1">{log.map((event, n) => <li key={`${event.at}-${n}`}><p className="text-[10px] tabular-nums text-sub">{clock(event.at)} · {event.status}</p><p className="mt-0.5 break-words leading-relaxed text-ink">{event.detail}</p></li>)}</ul>}
            {notes.map((note, n) => <p key={n} className={`mt-1.5 break-words leading-relaxed ${note.tone}`}>{note.text}</p>)}
          </div>}
        </li>;
      })}
    </ol>
    <div className="border-t border-hairline px-4 py-4">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-sub">Evidence gathered</p>
      <div className="mt-2 grid grid-cols-2 gap-2">{counts.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-hairline p-2.5"><div className="flex items-center justify-between text-[10.5px] text-sub">{label}<Icon className="h-3.5 w-3.5 text-sub/70" /></div><p className="mt-1.5 text-[18px] font-semibold leading-none tabular-nums text-ink">{value == null ? "—" : Number(value).toLocaleString()}</p></div>)}</div>
      <div className="mt-4 space-y-1 text-[10.5px] text-sub"><p className="break-all">Run ID: {id}</p>{state?.updated_at && <p>Last update: {clock(state.updated_at)} · Rwanda time</p>}{done && <p className="text-[#147D4B]">All steps finished. Evidence is ready for review.</p>}</div>
    </div>
  </SidePanel>;
}
