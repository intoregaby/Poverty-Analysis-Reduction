import React from "react";
import Card from "@/components/analyst/Card";

const TIERS = [
  { key: "stands_out", title: "Stands out from Rwanda", tone: "bg-red-50 text-red-700", help: "At least 2 standard errors worse than Rwanda." },
  { key: "possible", title: "Possible difference", tone: "bg-amber-50 text-amber-700", help: "Between 1 and 2 standard errors worse." },
  { key: "better", title: "Better than Rwanda", tone: "bg-emerald-50 text-emerald-700", help: "At least 2 standard errors better." },
  { key: "in_line", title: "In line with Rwanda", tone: "bg-slate-100 text-slate-600", help: "Within 1 standard error." },
];
const signed = (value) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

function Row({ row, tone }) {
  return <li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-hairline py-2 first:border-t-0">
    <span className="min-w-[180px] flex-1 text-[12px] font-medium text-ink">{row.label}</span>
    <span className="text-[12px] tabular-nums text-ink">{row.district_pct}% <span className="text-sub">vs {row.rwanda_pct}% in Rwanda</span></span>
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium tabular-nums ${tone}`}>{signed(row.difference_points)} pt{row.z != null ? ` · z ${row.z.toFixed(1)}` : ""}</span>
    <span className="basis-full text-[10.5px] text-sub">{row.reliability} · {row.note}</span>
  </li>;
}

export default function ProblemProfile({ profile }) {
  if (!profile) return null;
  const measured = profile.measured_factors;
  return <Card title="What stands out in this district" subtitle={`${profile.district} compared with Rwanda, measured against survey uncertainty`} inlineHelp
    info={`${profile.method} It shows where this district differs most. It does not show what causes poverty, and it does not recommend a programme.`}>
    <p className="text-[14px] font-semibold leading-relaxed text-ink">{profile.headline}</p>
    {profile.flags.length > 0 && <ul className="mt-2 space-y-1">{profile.flags.map((flag) => <li key={flag} className="rounded-md bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-800">{flag}</li>)}</ul>}
    {TIERS.map((tier) => profile[tier.key].length > 0 && <section key={tier.key} className="mt-4">
      <h3 className="text-[12px] font-semibold text-ink">{tier.title} <span className="font-normal text-sub">· {tier.help}</span></h3>
      <ul className="mt-1">{profile[tier.key].map((row) => <Row key={row.id} row={row} tone={tier.tone} />)}</ul>
    </section>)}
    {profile.context.length > 0 && <section className="mt-4"><h3 className="text-[12px] font-semibold text-ink">Context <span className="font-normal text-sub">· shown but not ranked</span></h3>
      <ul className="mt-1">{profile.context.map((row) => <li key={row.id} className="border-t border-hairline py-2 first:border-t-0"><span className="text-[12px] font-medium text-ink">{row.label}: {row.district_pct} points</span> <span className="text-[12px] text-sub">against {row.rwanda_pct} in Rwanda</span><p className="text-[10.5px] text-sub">{row.note}</p></li>)}</ul></section>}
    {measured && <p className="mt-4 rounded-lg bg-[#F7F9FC] p-3 text-[11px] leading-relaxed text-sub">Of the {Math.abs(measured.gap_points).toFixed(1)}-point difference in poverty from Rwanda, measured household factors explain {measured.explained_share_pct.toFixed(0)}%.{measured.strongest_factor ? ` The strongest is ${measured.strongest_factor.toLowerCase()} (${signed(measured.strongest_points)} points). See Drivers for the full breakdown.` : ""}</p>}
    <details className="mt-3 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">What this cannot tell you</summary><ul className="mt-2 list-disc pl-4">{profile.cannot_tell.map((item) => <li key={item}>{item}</li>)}</ul></details>
  </Card>;
}
