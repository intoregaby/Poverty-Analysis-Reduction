import React from "react";
import Card from "@/components/analyst/Card";

const ROWS = [
  ["excluded", "Using no financial service"],
  ["informal_only", "Using informal services only"],
  ["formal", "Formally served (bank or other regulated provider)"],
  ["mobile_money", "Registered mobile money users"],
];
const tone = (label = "") => (label.startsWith("Clear") ? "bg-emerald-50 text-emerald-700" : label.startsWith("Possible") ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600");
const signed = (value) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

export default function FinanceTrendEvidence({ trend }) {
  if (!trend) return null;
  if (trend.status !== "Completed") return <Card title="Financial inclusion since 2020" subtitle="FinScope 2020 and 2024"><p className="text-[12px] text-sub">The 2020 comparison could not be calculated for this run. {trend.reason}</p></Card>;
  const row = trend.changes.find((item) => item.district === trend.selected_district) ?? null;
  const national = trend.national;
  return <Card title="Financial inclusion since 2020" subtitle={`${row?.district ?? "District"} · FinScope 2020 to 2024 · ${row?.sample_adults_2020 ?? ""} adults surveyed in 2020`} inlineHelp
    info="2020 comes from NISR's own access strand in the survey data. 2024 uses NISR's published district figures, which are whole numbers, so the 2024 side carries an approximate margin. A change is called clear only after allowing for comparing 30 districts at once. Banked is not compared because NISR changed its definition between the two reports.">
    <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-brand">Aggregate comparison only</span>
    {row ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-[11px]"><thead className="bg-[#F7F9FC] text-sub"><tr>{["Group", "2020", "2024", "Change", "95% interval", "Result"].map((label) => <th key={label} className="p-2 font-medium">{label}</th>)}</tr></thead>
      <tbody>{ROWS.map(([key, label]) => { const cell = row[key]; const change = cell.change; return <tr key={key} className="border-t border-hairline"><td className="p-2 text-ink">{label}</td><td className="p-2 tabular-nums">{cell.y2020.pct == null ? "Withheld" : `${cell.y2020.pct.toFixed(1)}%`}</td><td className="p-2 tabular-nums">{cell.y2024_pct.toFixed(1)}%</td><td className="p-2 font-medium tabular-nums text-ink">{change ? `${signed(change.points)} pt` : "n/a"}</td><td className="p-2 tabular-nums text-sub">{change ? `${change.ci_lower.toFixed(1)} to ${change.ci_upper.toFixed(1)}` : ""}</td><td className="p-2">{change && <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${tone(change.label)}`}>{change.label.replace(" (not robust to testing 30 districts)", "")}</span>}</td></tr>; })}</tbody></table></div> : <p className="mt-3 text-[11px] text-sub">This district is not in the comparison.</p>}
    <p className="mt-3 rounded-lg bg-[#F7F9FC] p-3 text-[11px] leading-relaxed text-sub">Rwanda, % of adults: excluded {national.y2020_restated_published.excluded}% in 2020 and {national.y2024_published.excluded}% in 2024; informal only {national.y2020_restated_published.informal_only}% and {national.y2024_published.informal_only}%; formally served {national.y2020_restated_published.formal}% and {national.y2024_published.formal}%. Across 30 districts the excluded share clearly fell in {trend.change_counts.excluded["Clear fall"]}, and formal use clearly rose in {trend.change_counts.formal["Clear rise"]}.</p>
    <details className="mt-3 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">Checks against NISR's published figures and limits</summary>
      <ul className="mt-2 space-y-1">{trend.checks.map((item) => <li key={item.measure}>{item.measure.replaceAll("_", " ")}: calculated {item.calculated}% vs published {item.published}% ({item.ok ? "match" : "differs"}). {item.note}</li>)}</ul>
      <ul className="mt-2 list-disc pl-4">{trend.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>
  </Card>;
}
