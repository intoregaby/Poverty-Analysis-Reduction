import React from "react";
import Card from "@/components/analyst/Card";

const gradeStyle = (grade) => grade === "Reliable" ? "bg-emerald-50 text-emerald-700" : grade === "Use with caution" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";

export default function ReliabilityEvidence({ reliability }) {
  if (!reliability) return null;
  const { summary, national_reconciliation: checks } = reliability;
  return <Card title="How reliable are these numbers?" subtitle={`${reliability.district} · EICV7 2023/24 · approximate 95% intervals`} inlineHelp
    info="Each estimate is a survey sample, so it has a margin of error. The interval is the range the true value probably lies in. The grade compares the size of that margin with the estimate: a wide margin relative to the estimate means the figure should be used with care. Grades are this application's rule of thumb, not an NISR standard.">
    <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-[11px]"><thead className="bg-[#F7F9FC] text-sub"><tr>{["Measure", "Estimate", "95% interval", "Survey records", "Reliability"].map((label) => <th key={label} className="p-2 font-medium">{label}</th>)}</tr></thead>
      <tbody>{reliability.indicators.map((row) => <tr key={row.indicator} className="border-t border-hairline"><td className="p-2 text-ink">{row.indicator}</td><td className="p-2 font-medium tabular-nums text-ink">{row.estimate_pct == null ? "Withheld" : `${row.estimate_pct.toFixed(1)}%`}</td><td className="p-2 tabular-nums text-sub">{row.ci_lower == null ? "Unavailable" : `${row.ci_lower.toFixed(1)}–${row.ci_upper.toFixed(1)}%`}</td><td className="p-2 tabular-nums text-sub">{row.sample}</td><td className="p-2"><span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${gradeStyle(row.grade)}`}>{row.grade}</span></td></tr>)}</tbody></table></div>
    <p className="mt-3 text-[11px] text-sub">{summary.Reliable} reliable · {summary["Use with caution"]} use with caution · {summary["Low reliability"]} low reliability · {summary.Suppressed} withheld.</p>
    {checks && <p className="mt-2 rounded-lg bg-[#F7F9FC] p-3 text-[11px] leading-relaxed text-sub">National check against NISR's published figures: {checks.map((item) => `${item.indicator.replace("_", " ")} ${item.calculated}% calculated vs ${item.published}% published (${item.matches ? "match" : "does not match"})`).join("; ")}.</p>}
    <details className="mt-3 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">Method</summary><p className="mt-2">{reliability.rule}</p></details>
  </Card>;
}
