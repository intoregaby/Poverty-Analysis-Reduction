import React from "react";
import { CheckCircle2, ClipboardList, Plus, Undo2 } from "lucide-react";
import { isOpen, typeLabel } from "@/lib/actionRequests";
import { PriorityDot, StatusChip, Timeline, ago, dateLabel } from "./bits";

// What the analyst sees: every request for this district, and the programme team's answer.
export default function AnalystRequests({ district, requests, onNew, onWithdraw, onToggleAi }) {
  const mine = requests.filter((item) => item.district === district);
  return <section className="rounded-xl border border-hairline bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink"><ClipboardList className="h-4 w-4 text-brand" />Requests to programmes<span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-normal tabular-nums text-sub">{mine.length}</span></h3>
        <p className="mt-1 text-[11.5px] leading-relaxed text-sub">Ask a programme team to verify, review or act on what this investigation found. Their answer appears here.</p></div>
      <button type="button" onClick={() => onNew()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-[12px] font-medium text-white hover:bg-[#524BE0]"><Plus className="h-3.5 w-3.5" />New request</button>
    </div>
    {mine.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-hairline bg-canvas/50 px-4 py-6 text-center text-[12px] text-sub">No requests for {district} yet. When the findings call for action on the ground, send one from here.</p>
      : <ul className="mt-4 space-y-3">{mine.map((item) => <li key={item.id} className="rounded-lg border border-hairline p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-[10.5px] text-sub">{item.id} · {typeLabel(item.type)} · {item.programme}{item.sample && <span className="ml-1.5 rounded bg-canvas px-1.5 py-0.5">sample</span>}</p><h4 className="mt-0.5 text-[13px] font-semibold text-ink">{item.title}</h4></div><div className="flex items-center gap-2"><PriorityDot priority={item.priority} /><StatusChip status={item.status} /></div></div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink">{item.ask}</p>
        <p className="mt-1.5 text-[10.5px] text-sub">Sent {ago(item.createdAt)} by {item.createdBy.name}{item.assignee ? ` · assigned to ${item.assignee}` : ""}{item.due && isOpen(item.status) ? ` · due ${dateLabel(item.due)}` : ""}</p>
        {item.status === "Completed" && item.outcome && <div className="mt-3 rounded-lg border border-[#ABEFC6] bg-[#ECFDF3]/60 p-3"><p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#067647]"><CheckCircle2 className="h-3.5 w-3.5" />What the programme team found</p><p className="mt-1 text-[12px] leading-relaxed text-ink">{item.outcome.note}</p><p className="mt-1 text-[10.5px] text-sub">{item.outcome.by}, {dateLabel(item.outcome.at)}. It is an unverified field report. Record it in your review notes if it changes your conclusion.</p><label className="mt-2 flex cursor-pointer items-start gap-2 rounded-md bg-white/70 p-2 text-[11px] text-ink"><input type="checkbox" checked={item.aiInclude !== false} onChange={(event) => onToggleAi(item.id, event.target.checked)} className="mt-0.5 accent-[#635BFF]" /><span><span className="font-medium">Let the AI use this in the chat and notebook for {item.district}</span><span className="block text-sub">Shown to the AI as a "programme-team finding" with its date, kept apart from the survey figures. It never changes the calculations or the report. Switch it off any time; it also expires after 180 days.</span></span></label></div>}
        {item.status === "Declined" && <div className="mt-3 rounded-lg border border-[#FEE4E2] bg-[#FEF3F2]/60 p-3"><p className="text-[11.5px] font-semibold text-[#B42318]">Declined</p><p className="mt-1 text-[12px] leading-relaxed text-ink">{item.history.at(-1)?.note}</p></div>}
        <details className="mt-2.5 text-[11.5px]"><summary className="cursor-pointer font-medium text-ink">History ({item.history.length})</summary><div className="mt-2.5"><Timeline history={item.history} /></div></details>
        {item.status === "Submitted" && <button type="button" onClick={() => onWithdraw(item)} className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-[11.5px] font-medium text-ink hover:bg-canvas"><Undo2 className="h-3 w-3" />Withdraw request</button>}
      </li>)}</ul>}
  </section>;
}
