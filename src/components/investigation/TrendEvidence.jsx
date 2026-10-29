import React from "react";
import Card from "@/components/analyst/Card";

const tone = (label = "") => label.startsWith("Clear improvement") ? "bg-emerald-50 text-emerald-700" : label.startsWith("Clear worsening") ? "bg-red-50 text-red-700" : label.startsWith("Possible") ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
const pct = (item) => item?.pct == null ? "Withheld" : `${item.pct.toFixed(1)}%`;
const range = (item) => item?.pct == null ? "" : `${item.ci_lower.toFixed(1)}–${item.ci_upper.toFixed(1)}%`;
const PERIODS = [["change_2010_11_to_2013_14", "2010/11 to 2013/14"], ["change_2013_14_to_2016_17", "2013/14 to 2016/17"]];

function Basis({ children }) { return <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-brand">{children}</span>; }

export default function TrendEvidence({ trends }) {
  if (!trends) return <p className="rounded-xl border border-dashed border-hairline bg-white p-6 text-center text-[12px] text-sub">This saved run predates the poverty trend analysis. Start a new run to include it.</p>;
  if (trends.status !== "Completed") return <Card title="How has poverty changed?" subtitle="EICV3 to EICV7"><p className="text-[12px] text-sub">Poverty trends could not be calculated for this run. {trends.reason}</p></Card>;
  const { selected, old_series: old, new_series: modelled, panel, national_checks: checks } = trends;
  const row = selected.old_series;
  const next = selected.new_series;
  const worse = (key) => old.filter((item) => item[key]?.label === "Clear worsening").map((item) => item.district);
  const better = (key) => old.filter((item) => item[key]?.label === "Clear improvement").length;
  return <div className="space-y-4">
    <Card title="How has poverty changed?" subtitle={`${trends.district} · EICV3 2010/11 to EICV5 2016/17 · same poverty method`} inlineHelp
      info="Each survey interviews a different sample of households, so every rate has a margin of error. A change is called clear only if it is larger than that margin even after allowing for comparing 30 districts at once. Samples are separate surveys, so this describes change and does not explain it.">
      <Basis>Aggregate comparison only</Basis>
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-[11px]"><thead className="bg-[#F7F9FC] text-sub"><tr>{["Survey", "Period", "Poverty", "95% interval", "Survey households"].map((label) => <th key={label} className="p-2 font-medium">{label}</th>)}</tr></thead>
        <tbody>{[["EICV3", "2010/11", row.eicv3], ["EICV4", "2013/14", row.eicv4], ["EICV5", "2016/17", row.eicv5]].map(([name, period, item]) => <tr key={name} className="border-t border-hairline"><td className="p-2 text-ink">{name}</td><td className="p-2 text-sub">{period}</td><td className="p-2 font-medium tabular-nums text-ink">{pct(item)}</td><td className="p-2 tabular-nums text-sub">{range(item)}</td><td className="p-2 tabular-nums text-sub">{item.households ?? ""}</td></tr>)}</tbody></table></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{PERIODS.map(([key, label]) => <div key={key} className="rounded-lg border border-hairline p-3 text-[11px]"><p className="text-sub">{label}</p>{row[key] ? <><p className="mt-1 text-[16px] font-semibold tabular-nums text-ink">{row[key].points > 0 ? "+" : ""}{row[key].points.toFixed(1)} points</p><p className="text-sub">95% interval {row[key].ci_lower.toFixed(1)} to {row[key].ci_upper.toFixed(1)}</p><span className={`mt-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${tone(row[key].label)}`}>{row[key].label}</span></> : <p className="mt-1 text-sub">Not enough survey households to compare.</p>}</div>)}</div>
      <p className="mt-3 rounded-lg bg-[#F7F9FC] p-3 text-[11px] leading-relaxed text-sub">Across all 30 districts: {better("change_2010_11_to_2013_14")} clearly improved from 2010/11 to 2013/14 and {better("change_2013_14_to_2016_17")} from 2013/14 to 2016/17. Clear worsening: {worse("change_2010_11_to_2013_14").join(", ") || "none"} (first period); {worse("change_2013_14_to_2016_17").join(", ") || "none"} (second period). Most districts show no clear change because each district sample is small.</p>
    </Card>
    <Card title="Poverty since 2016/17 on the current method" subtitle={`${trends.district} · NISR modelled 2016/17 to EICV7 2023/24`} inlineHelp
      info="NISR changed how poverty is measured for EICV7, so EICV5's own rate cannot be compared with EICV7. NISR re-estimated 2016/17 with the new method; those are the figures used here. They are NISR's published numbers and have no district-level margin of error.">
      <Basis>Aggregate comparison only</Basis>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-[#F7F9FC] p-3"><p className="text-[10.5px] text-sub">2016/17 (NISR modelled)</p><p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{next.eicv5_modelled_pct.toFixed(1)}%</p></div>
        <div className="rounded-lg bg-[#F7F9FC] p-3"><p className="text-[10.5px] text-sub">2023/24 (EICV7, calculated)</p><p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{pct(next.eicv7)}</p><p className="text-[10.5px] text-sub">95% interval {range(next.eicv7)}</p></div>
        <div className="rounded-lg bg-[#F7F9FC] p-3"><p className="text-[10.5px] text-sub">Fall in poverty rate</p><p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{next.decrease_points.toFixed(1)} points</p><p className="text-[10.5px] text-sub">Rank {next.smallest_decrease_rank} of 30 (1 = smallest fall)</p></div>
      </div>
      <p className="mt-3 text-[11px] text-sub">The calculated 2023/24 rate matches NISR's published district figure in {trends.validation.new_series_eicv7_matches_published}. Nationally NISR estimates 39.8% in 2016/17 and 27.4% in 2023/24.</p>
      <details className="mt-3 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">All 30 districts, smallest fall first</summary><div className="mt-2 max-h-[300px] overflow-auto"><table className="w-full min-w-[420px] text-left"><thead className="sticky top-0 bg-[#F7F9FC]"><tr>{["District", "2016/17 modelled", "2023/24", "Fall (points)"].map((label) => <th key={label} className="p-2 font-medium">{label}</th>)}</tr></thead><tbody>{[...modelled].sort((a, b) => a.decrease_points - b.decrease_points).map((item) => <tr key={item.district} className={`border-t border-hairline ${item.district === trends.district ? "bg-indigo-50/60 font-medium text-ink" : ""}`}><td className="p-2">{item.district}</td><td className="p-2 tabular-nums">{item.eicv5_modelled_pct.toFixed(1)}%</td><td className="p-2 tabular-nums">{pct(item.eicv7)}</td><td className="p-2 tabular-nums">{item.decrease_points.toFixed(1)}</td></tr>)}</tbody></table></div></details>
    </Card>
    <Card title="Who escaped poverty and who fell back?" subtitle={`Same people followed from EICV3 (2010/11) to EICV4 (2013/14) · ${panel.people} people in ${panel.households} households`} inlineHelp
      info="The panel interviewed the same households twice. Each result describes people, using their household's poverty status. Some movement is measurement error in reported consumption, so real mobility is probably smaller than shown.">
      <Basis>Household-level linked</Basis>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-[#F7F9FC] p-3"><p className="text-[10.5px] text-sub">Poor in 2010/11 and not poor in 2013/14</p><p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{pct(panel.overall.escaped_poverty)}</p><p className="text-[10.5px] text-sub">95% interval {range(panel.overall.escaped_poverty)}</p></div>
        <div className="rounded-lg bg-[#F7F9FC] p-3"><p className="text-[10.5px] text-sub">Not poor in 2010/11 and poor in 2013/14</p><p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{pct(panel.overall.fell_into_poverty)}</p><p className="text-[10.5px] text-sub">95% interval {range(panel.overall.fell_into_poverty)}</p></div>
      </div>
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-[11px]"><thead className="bg-[#F7F9FC] text-sub"><tr>{["Province", "Escaped poverty", "Fell into poverty", "People"].map((label) => <th key={label} className="p-2 font-medium">{label}</th>)}</tr></thead><tbody>{panel.by_province.map((item) => <tr key={item.province} className="border-t border-hairline"><td className="p-2 text-ink">{item.province}</td><td className="p-2 tabular-nums">{pct(item.escaped_poverty)} <span className="text-sub">({range(item.escaped_poverty)})</span></td><td className="p-2 tabular-nums">{pct(item.fell_into_poverty)} <span className="text-sub">({range(item.fell_into_poverty)})</span></td><td className="p-2 tabular-nums text-sub">{item.people}</td></tr>)}</tbody></table></div>
      <p className="mt-2 text-[10.5px] text-sub">Panel results are provincial, not district-level, because the panel is too small for districts.</p>
    </Card>
    <details className="rounded-xl border border-hairline bg-white p-4 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">Checks against NISR's published figures and limits</summary>
      <ul className="mt-2 space-y-1">{checks.map((item) => <li key={item.round}>{item.round}: calculated {item.calculated}% vs published {item.published}% ({item.matches ? "match" : "does not match"}){item.note ? `. ${item.note}` : ""}</li>)}</ul>
      <ul className="mt-2 list-disc pl-4">{trends.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>
  </div>;
}
