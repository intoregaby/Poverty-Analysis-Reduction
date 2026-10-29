import React from "react";

export default function InvestigationStatus({ value, label = null }) {
  const tone = { Completed: "bg-[#EAF7F0] text-[#147D4B]", Warning: "bg-amber-50 text-amber-700", Failed: "bg-red-50 text-red-700", Running: "bg-indigo-50 text-brand", Pending: "bg-slate-100 text-sub", Skipped: "bg-slate-100 text-sub" };
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${tone[value] || tone.Pending}`}>{label || value || "Pending"}</span>;
}
