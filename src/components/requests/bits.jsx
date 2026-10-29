import React from "react";

const STATUS_STYLE = {
  Submitted: "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]",
  Accepted: "border-[#D3CEFF] bg-[#EFEDFF] text-[#4B3FCC]",
  "In progress": "border-[#D3CEFF] bg-[#EFEDFF] text-[#4B3FCC]",
  Completed: "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]",
  Declined: "border-[#FEE4E2] bg-[#FEF3F2] text-[#B42318]",
  Withdrawn: "border-hairline bg-[#FAFBFD] text-[#8A94A6]",
};
const PRIORITY_STYLE = { High: "text-[#B42318]", Medium: "text-[#B54708]", Low: "text-sub" };

export function StatusChip({ status }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${STATUS_STYLE[status] || STATUS_STYLE.Withdrawn}`}>{status}</span>;
}

export function PriorityDot({ priority }) {
  return <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${PRIORITY_STYLE[priority] || "text-sub"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{priority}</span>;
}

export const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Kigali" }) : "";

export function ago(value) {
  const hours = (Date.now() - Date.parse(value)) / 3600000;
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function Timeline({ history }) {
  return <ol className="space-y-3">{history.map((step, index) => <li key={`${step.at}-${index}`} className="relative flex gap-3">
    {index < history.length - 1 && <span aria-hidden className="absolute left-[5px] top-3.5 h-[calc(100%+4px)] w-px bg-hairline" />}
    <span className="relative z-[1] mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-white bg-brand ring-1 ring-brand/30" />
    <div className="min-w-0 flex-1"><p className="flex flex-wrap items-center gap-x-2 text-[11.5px]"><StatusChip status={step.status} /><span className="font-medium text-ink">{step.by}</span><span className="text-sub">{dateLabel(step.at)}</span></p>{step.note && <p className="mt-1 text-[11.5px] leading-relaxed text-sub">{step.note}</p>}</div>
  </li>)}</ol>;
}
