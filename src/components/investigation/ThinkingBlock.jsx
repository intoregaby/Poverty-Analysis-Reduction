import React, { useEffect, useState } from "react";
import { AlertCircle, Check, ChevronRight, Loader2, PanelRightOpen, Sparkles } from "lucide-react";
import { formatDuration, isFinished, stageSummary, stageTimes } from "./stageInfo";

// Starts open with the steps listed. The header folds it; the Panel button opens the full task panel.
export default function ThinkingBlock({ district, state, stages, panelOpen, onOpenPanel, onClosePanel }) {
  const [expanded, setExpanded] = useState(true);
  const [now, setNow] = useState(Date.now());
  const done = ["Completed", "Warning"].includes(state?.status);
  const failed = state?.status === "Failed";
  const running = !done && !failed;
  const events = state?.recent_events || [];
  const times = stageTimes(events);
  const started = state?.started_at ? Date.parse(state.started_at) : null;
  const ended = done || failed ? Date.parse(state?.updated_at) : now;
  const total = started ? ended - started : null;
  const finished = stages.filter(isFinished).length;
  const current = stages.find((stage) => stage.status === "Running") || stages.find((stage) => stage.status === "Failed") || stages.find((stage) => !isFinished(stage));

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const toggle = () => { if (expanded && panelOpen) onClosePanel(); setExpanded(!expanded); };
  const title = done ? `Investigated ${state?.district || district}` : failed ? "Investigation stopped" : `Investigating ${state?.district || district}`;
  const detail = done ? `${stages.length} steps` : failed ? `Stopped at ${current?.name || "a step"}` : current ? stageSummary(current, state?.counts) : "Getting ready";

  return <section aria-label="Investigation thinking" className="overflow-hidden rounded-xl border border-hairline bg-white shadow-[0_1px_3px_rgba(10,37,64,0.04)]">
    <div className="flex items-center"><button type="button" onClick={toggle} aria-expanded={expanded} className="group flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${failed ? "bg-red-50 text-red-600" : done ? "bg-[#EAF7F0] text-[#147D4B]" : "bg-brand-soft text-brand"}`}>
        {failed ? <AlertCircle className="h-4 w-4" /> : done ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4 motion-safe:animate-pulse" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2"><span className={`text-[13px] font-medium ${running ? "thinking-shimmer" : "text-ink"}`}>{title}</span>{total != null && <span className="text-[11px] tabular-nums text-sub">{formatDuration(total)}</span>}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-sub" role="status">{detail}</span>
      </span>
      <ChevronRight className={`h-4 w-4 shrink-0 text-sub transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
    </button>
    <button type="button" onClick={panelOpen ? onClosePanel : onOpenPanel} aria-pressed={panelOpen} aria-label="Open the task panel" title="Task panel" className={`mr-3 grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-canvas ${panelOpen ? "bg-brand-soft text-brand" : "text-sub"}`}><PanelRightOpen className="h-4 w-4" /></button></div>
    {expanded && <div className="border-t border-hairline bg-canvas/50 px-4 py-3">
      <ol className="relative space-y-2.5">
        {stages.map((stage, index) => {
          const active = stage.status === "Running";
          const bad = stage.status === "Failed";
          const finishedStage = isFinished(stage);
          const span = times[stage.name];
          const length = span?.start && (span.end || active) ? (span.end || now) - span.start : null;
          return <li key={stage.name} className="relative flex gap-3">
            {index < stages.length - 1 && <span aria-hidden className="absolute left-[9px] top-5 h-[calc(100%+4px)] w-px bg-hairline" />}
            <span className={`relative z-[1] mt-0.5 grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full border ${bad ? "border-red-200 bg-red-50 text-red-600" : finishedStage ? "border-brand/20 bg-brand text-white" : active ? "border-brand/40 bg-white text-brand" : "border-hairline bg-white text-transparent"}`}>
              {bad ? <AlertCircle className="h-3 w-3" /> : finishedStage ? <Check className="h-3 w-3" strokeWidth={3} /> : active ? <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" /> : <span className="h-1 w-1 rounded-full bg-[#CBD3DF]" />}
            </span>
            <span className="min-w-0 flex-1 text-[12px] leading-snug"><span className={`${active ? "font-medium text-brand" : finishedStage ? "text-ink" : "text-sub"}`}>{stageSummary(stage, state?.counts)}</span>{length != null && <span className="ml-2 text-[10.5px] tabular-nums text-sub">{formatDuration(length)}</span>}</span>
          </li>;
        })}
      </ol>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-hairline pt-2.5 text-[11px] text-sub"><span className="tabular-nums">{finished} of {stages.length} steps finished</span></div>
    </div>}
  </section>;
}
