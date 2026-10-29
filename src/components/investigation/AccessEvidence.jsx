import React from "react";
import Card from "@/components/analyst/Card";

const gradeStyle = (grade) => grade === "Reliable" ? "bg-emerald-50 text-emerald-700" : grade === "Use with caution" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
const ROWS = [
  ["banked", "Banked"],
  ["other_formal", "Other formal, not banked (mobile money, SACCO, insurance, pension)"],
  ["informal_only", "Informal only (savings groups, tontines)"],
  ["excluded", "Excluded (no formal or informal product)"],
];
const interval = (item) => `${item.ci_lower.toFixed(1)}–${item.ci_upper.toFixed(1)}%`;
const signed = (value) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

export default function AccessEvidence({ access, trend = null }) {
  if (!access) return <p className="rounded-xl border border-dashed border-hairline bg-white p-6 text-center text-[12px] text-sub">This saved run predates the financial access analysis. Start a new run to include it.</p>;
  if (access.status !== "Completed") return <Card title="Financial access" subtitle="FinScope Rwanda 2024"><p className="text-[12px] text-sub">Financial access could not be calculated for this run. {access.reason}</p></Card>;
  const { selected, national, reconciliation_with_published: published, association_with_poverty: link, published_district: official, published_national: officialNational } = access;
  const gap = official ? selected.strands.excluded.pct - official.excluded : null;
  const worst = published?.districts?.largest_difference?.excluded;
  const bias = trend?.reconstruction_check?.difference_points?.excluded;

  return <Card title="Financial access" subtitle={`${access.district} · FinScope Rwanda 2024 · ${selected.sample_adults} adults surveyed in this district`} inlineHelp
    info="Adults aged 16+ are placed in one group each, in this order: banked, other formal, informal only, excluded. Someone counts as served if they have or use a product, including a relative's or a group's account. The table shows NISR's published district figures. A second view rebuilds the groups from the questionnaire; it can differ from NISR's by many points, so NISR's figures are the official ones. FinScope is a separate survey that is not linked to the poverty survey household by household.">
    {official ? <>
      <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-[11px]"><thead className="bg-[#F7F9FC] text-sub"><tr>{["Group", `${access.district}`, "Rwanda"].map((label) => <th key={label} className="p-2 font-medium">{label}</th>)}</tr></thead>
        <tbody>{ROWS.map(([key, label]) => <tr key={key} className="border-t border-hairline"><td className="p-2 text-ink">{label}</td><td className="p-2 font-medium tabular-nums text-ink">{official[key]}%</td><td className="p-2 tabular-nums text-sub">{officialNational[key]}%</td></tr>)}</tbody></table></div>
      <p className="mt-2 text-[10.5px] text-sub">Published by NISR (FinScope 2024, Figure 13), whole numbers; district samples are small, so differences of a few points between districts are not meaningful.</p>
    </> : <p className="rounded-lg bg-amber-50 p-3 text-[11px] text-amber-800">NISR's published district figures do not include {access.district}. The estimate rebuilt from the questionnaire is shown below and is approximate.</p>}
    <p className="mt-3 rounded-lg bg-[#F7F9FC] p-3 text-[11px] leading-relaxed text-sub">Mobile money reaches an estimated <strong className="text-ink">{selected.mobile_money.pct.toFixed(1)}%</strong> of adults here (Rwanda {national.mobile_money.pct.toFixed(1)}%), counting anyone who uses mobile money from the questionnaire answers. NISR reports that 86% of Rwandan adults own or have used mobile money and 77% hold a registered wallet, so this is a close but not identical measure.</p>
    {access.excluded_rank && <p className="mt-2 text-[11px] text-sub">{access.district} ranks {access.excluded_rank.rank} of {access.excluded_rank.of} districts for the excluded share (1 = highest), using NISR's published figures.</p>}
    {link && link.spearman_rho != null && <p className="mt-2 text-[11px] text-sub">Across {link.districts_compared} districts, higher excluded share goes with higher poverty only weakly: rank correlation {link.spearman_rho.toFixed(2)}{link.bootstrap_95_interval ? ` (95% interval ${link.bootstrap_95_interval[0].toFixed(2)} to ${link.bootstrap_95_interval[1].toFixed(2)})` : ""}. {link.bootstrap_95_interval && link.bootstrap_95_interval[0] <= 0 ? "The interval includes zero, so no link is established. " : ""}This compares area averages from two surveys and does not show cause.</p>}

    <details className="mt-3 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">Estimate rebuilt from the questionnaire (approximate)</summary>
      <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[520px] text-left"><thead className="bg-[#F7F9FC]"><tr>{["Group", "Estimate", "95% interval", "Reliability", official ? "NISR published" : "Rwanda estimate"].map((label) => <th key={label} className="p-2 font-medium">{label}</th>)}</tr></thead>
        <tbody>{ROWS.map(([key, label]) => <tr key={key} className="border-t border-hairline"><td className="p-2 text-ink">{label.split(" (")[0]}</td><td className="p-2 font-medium tabular-nums text-ink">{selected.strands[key].pct.toFixed(1)}%</td><td className="p-2 tabular-nums">{interval(selected.strands[key])}</td><td className="p-2"><span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${gradeStyle(selected.strands[key].grade)}`}>{selected.strands[key].grade}</span></td><td className="p-2 tabular-nums">{official ? `${official[key]}%` : `${national.strands[key].pct.toFixed(1)}%`}</td></tr>)}</tbody></table></div>
      {gap != null && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-amber-800">For {access.district} the rebuilt excluded share is {signed(gap)} points from NISR's {official.excluded}%. Across all districts the gap averages {published?.districts?.mean_absolute_difference_points?.excluded} points and reaches {worst?.points} points ({worst?.district}). Do not use the rebuilt strand in place of NISR's figures.</p>}
      <p className="mt-2">Community health insurance (Mutuelle de Santé) is not counted as a formal product. Counting it would leave far fewer adults excluded than NISR reports, so NISR does not count it in full; its exact rule cannot be recovered from the questionnaire.{bias != null ? ` On the 2020 survey, where NISR's own strand is available, the same rules match the national formal share but over-count exclusion by ${bias.toFixed(1)} points.` : ""}</p>
    </details>

    {published && <details className="mt-3 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">Check against the published FinScope report</summary>
      <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[420px] text-left"><thead className="bg-[#F7F9FC]"><tr>{["Rwanda, all adults", "This estimate", "Published", "Difference"].map((label) => <th key={label} className="p-2 font-medium">{label}</th>)}</tr></thead>
        <tbody>{ROWS.map(([key, label]) => <tr key={key} className="border-t border-hairline"><td className="p-2">{label.split(" (")[0]}</td><td className="p-2 tabular-nums">{published.national[key].estimated.toFixed(1)}%</td><td className="p-2 tabular-nums">{published.national[key].published}%</td><td className="p-2 tabular-nums">{published.national[key].difference_points > 0 ? "+" : ""}{published.national[key].difference_points.toFixed(1)} points</td></tr>)}</tbody></table></div>
      {published.districts && <p className="mt-2">Across {published.districts.compared} districts the average gap from the published chart is {Object.entries(published.districts.mean_absolute_difference_points).map(([key, value]) => `${key.replace("_", " ")} ${value}`).join(", ")} points.</p>}
      <p className="mt-2">{published.reading} <a className="text-brand underline" href={published.source} target="_blank" rel="noreferrer">FinScope 2024 report</a></p></details>}
    <details className="mt-3 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">Methods and limits</summary><p className="mt-2">{access.definitions.rule}</p><p className="mt-2">{access.definitions.uncertainty}</p><ul className="mt-2 list-disc pl-4">{access.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>
  </Card>;
}
