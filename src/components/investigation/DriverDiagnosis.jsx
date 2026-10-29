import React from "react";
import Card from "@/components/analyst/Card";

const PLAIN_METHOD = "We compare households across Rwanda to see which conditions go with being poor. Then we ask how many points of this district's gap to Rwanda line up with each condition, such as grid electricity or farm-only work, while holding the other conditions fixed. The thin bars show how sure we can be. The part left over is poverty these household conditions do not explain, such as local markets, land or shocks. Nothing here proves a cause.";
const gradeStyle = (grade) => grade.startsWith("Strong") ? "bg-emerald-50 text-emerald-700" : grade.startsWith("Moderate") ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";

function Tile({ label, district, national, suffix = "%" }) {
  return <div className="rounded-lg bg-[#F7F9FC] p-3"><p className="text-[10.5px] text-sub">{label}</p><p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{district}{suffix}</p><p className="text-[10.5px] text-sub">Rwanda {national}{suffix}</p></div>;
}

const POVERTY_LEGEND = "Right of the line raises the district above Rwanda; left lowers it. Thin bars show the 95% interval; faded bars are not established.";

function ContributionBars({ groups, legend = POVERTY_LEGEND }) {
  const rows = [...groups].sort((a, b) => Math.abs(b.contribution_points) - Math.abs(a.contribution_points));
  const limit = Math.max(2, ...rows.map((row) => Math.max(Math.abs(row.ci_lower), Math.abs(row.ci_upper))));
  const place = (value) => `${50 + (value / limit) * 48}%`;
  return <div className="mt-3 space-y-1.5" role="img" aria-label="Contribution of each factor group to the gap, in percentage points, with 95% intervals">
    {rows.map((row) => <div key={row.id} className="grid grid-cols-[minmax(80px,115px)_1fr_44px] items-center gap-2 text-[10.5px] sm:grid-cols-[minmax(120px,210px)_1fr_56px]">
      <span className="truncate text-ink" title={row.label}>{row.label}{row.role === "marker" ? " (sign)" : ""}</span>
      <div className="relative h-4"><div className="absolute left-1/2 top-0 h-4 w-px bg-slate-300" />
        <div className="absolute top-1.5 h-1 rounded bg-slate-200" style={{ left: place(row.ci_lower), width: `${((row.ci_upper - row.ci_lower) / limit) * 48}%` }} />
        <div className={`absolute top-0.5 h-3 rounded-sm ${row.contribution_points >= 0 ? "bg-brand" : "bg-[#A3ADBD]"}`} style={{ left: row.contribution_points >= 0 ? "50%" : place(row.contribution_points), width: `${(Math.abs(row.contribution_points) / limit) * 48}%`, opacity: row.grade === "Not established" ? 0.4 : 1 }} /></div>
      <span className="text-right tabular-nums text-sub">{row.contribution_points > 0 ? "+" : ""}{row.contribution_points.toFixed(1)}</span>
    </div>)}
    <p className="text-[10px] text-sub">{legend}</p>
  </div>;
}

function PlaceEffect({ place, district }) {
  const limit = Math.max(10, ...place.districts.map((row) => Math.abs(row.unexplained_points)));
  const peers = new Set(place.peers.map((row) => row.district));
  return <div className="mt-2"><p className="text-[11px] text-sub">{place.reading}</p>
    <div className="mt-2 max-h-[260px] space-y-0.5 overflow-auto pr-1">{place.districts.map((row) => <div key={row.district} className="grid grid-cols-[84px_1fr_40px] items-center gap-2 text-[10px]">
      <span className={row.district === district ? "font-semibold text-ink" : peers.has(row.district) ? "text-ink" : "text-sub"}>{row.district}</span>
      <div className="relative h-2"><div className="absolute left-1/2 h-2 w-px bg-slate-300" /><div className={`absolute h-2 rounded-sm ${row.district === district ? "bg-brand" : peers.has(row.district) ? "bg-indigo-300" : "bg-slate-300"}`} style={{ left: row.unexplained_points >= 0 ? "50%" : `${50 + (row.unexplained_points / limit) * 50}%`, width: `${(Math.abs(row.unexplained_points) / limit) * 50}%` }} /></div>
      <span className="text-right tabular-nums text-sub">{row.unexplained_points > 0 ? "+" : ""}{row.unexplained_points.toFixed(1)}</span></div>)}</div>
    <p className="mt-2 text-[10px] text-sub">{place.note} Highlighted: selected district (dark) and same-province districts (light).</p></div>;
}

const LIVING_LEGEND = "Right of the line lowers typical spending in this district relative to Rwanda; left raises it. Thin bars show the 95% interval; faded bars are not established.";

function LivingStandards({ view, district }) {
  const lower = view.spending_difference_pct < 0;
  const clear = view.explained_excl_markers_share_pct != null;
  const fit = view.explainability;
  const percent = (value) => `${(100 * value).toFixed(0)}%`;
  return <Card title="Another way to look: average living standards" subtitle={`${district} · typical spending per adult equivalent, not just who is below the line`} inlineHelp
    info={`${view.method} ${view.limitations}`}>
    <p className="text-[14px] font-semibold leading-relaxed text-ink">Typical household spending in {district} is {Math.abs(view.spending_difference_pct).toFixed(1)}% {lower ? "lower" : "higher"} than in Rwanda.</p>
    <p className="mt-1 text-[11.5px] leading-relaxed text-sub">{clear ? `Measured household factors line up with ${view.explained_excl_markers_share_pct.toFixed(0)}% of this difference (${view.explained_share_pct.toFixed(0)}% counting signs of deprivation such as durable goods and housing materials, which are largely a result of low spending). ` : "The difference is under 2 points, so there is nothing meaningful to split. "}The unexplained part is {view.unexplained_points.toFixed(1)} of {view.shortfall_points.toFixed(1)} points (95% interval {view.unexplained_ci[0]} to {view.unexplained_ci[1]}).</p>
    <ContributionBars groups={view.groups} legend={LIVING_LEGEND} />
    <div className="mt-3 rounded-lg bg-[#F7F9FC] p-3 text-[11px] leading-relaxed text-sub">
      <p><strong className="text-ink">How much can household factors explain at all?</strong> Tested on households held out of the fit: <strong className="text-ink">{percent(fit.living_standards_out_of_sample_r_squared)}</strong> of the variation in spending, but only <strong className="text-ink">{percent(fit.poverty_status_out_of_sample_r_squared)}</strong> of the variation in who is poor.</p>
      <p className="mt-1">Whether a household sits just below or just above the poverty line is noisy, so poverty status is hard to predict even when spending is well explained. This is why the poverty gap above looks less explained than this one.</p>
    </div>
  </Card>;
}

export default function DriverDiagnosis({ drivers, diagnosis }) {
  if (!drivers || !diagnosis) return null;
  const depth = drivers.depth;
  const aiContext = `Answer for a policy analyst in plain language. Avoid statistical jargon such as Oaxaca-Blinder, bootstrap or PSU; say what the numbers mean for decisions and what must still be checked locally. Gap to Rwanda ${drivers.gap_points} points; explained ${drivers.explained_points}; unexplained ${drivers.unexplained_points}. Groups: ${drivers.groups.map((g) => `${g.label}: ${g.contribution_points} (${g.ci_lower} to ${g.ci_upper}, ${g.grade})`).join("; ")}. ${drivers.interpretation} ${drivers.limitations}`;
  return <section className="space-y-4">
    <Card title="What is driving poverty here?" subtitle={`${drivers.district} · EICV7 2023/24 · gap to Rwanda ${drivers.gap_points > 0 ? "+" : ""}${drivers.gap_points.toFixed(1)} points`} inlineHelp
      info={PLAIN_METHOD} aiInsight="Use the measured contributions and their limits." aiContext={aiContext}>
      <p className="text-[14px] font-semibold leading-relaxed text-ink">{diagnosis.headline}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-sub">{diagnosis.reading}</p>
      <p className="mt-1 rounded-md bg-amber-50 p-2 text-[10.5px] text-amber-800">{diagnosis.causal_status}</p>
      <ContributionBars groups={drivers.groups} />
      <p className="mt-3 text-[11px] text-sub">Explained by measured causes and access factors: <strong className="text-ink">{drivers.explained_excl_markers_points.toFixed(1)}</strong> points ({drivers.explained_points.toFixed(1)} counting signs of deprivation) · unexplained: <strong className="text-ink">{drivers.unexplained_points.toFixed(1)}</strong> (95% interval {drivers.unexplained_ci[0]} to {drivers.unexplained_ci[1]}) · model R² {drivers.model.weighted_r_squared}.</p>
      {drivers.model.education_work_checks?.length > 0 && <details className="mt-3 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">Education and work measures checked against NISR</summary>
        <ul className="mt-2 space-y-1">{drivers.model.education_work_checks.map((item) => <li key={item.measure}>{item.measure.replaceAll("_", " ")}: {item.calculated != null ? `calculated ${item.calculated}% vs NISR ${item.published}% (${item.ok ? "match" : "differs"})` : item.ok ? "answered where expected" : "NOT answered where expected"}</li>)}</ul>
        <p className="mt-2">These checks run on every analysis. If a definition stops matching NISR's published literacy and education figures, the analysis stops instead of using it.</p></details>}
    </Card>
    {drivers.consumption_view && <LivingStandards view={drivers.consumption_view} district={drivers.district} />}
    {diagnosis.ranked_drivers.length > 0 && <div className="grid gap-3 lg:grid-cols-2">{diagnosis.ranked_drivers.map((item) => <article key={item.id} className="rounded-xl border border-hairline bg-white p-4 shadow-[0_2px_8px_rgba(10,37,64,0.04)]">
      <div className="flex items-start justify-between gap-2"><h3 className="text-[13px] font-semibold text-ink">{item.rank}. {item.label}</h3><span className={`shrink-0 rounded-md px-2 py-1 text-[10.5px] font-medium ${gradeStyle(item.grade)}`}>{item.grade}</span></div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink">{item.finding}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-sub"><strong className="text-ink">Hypothesis to test:</strong> {item.mechanism_hypothesis}</p>
      <details className="mt-2 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">Confirm with, responses to research, reading</summary>
        <p className="mt-2 font-medium text-ink">Confirm with</p><ul className="list-disc pl-4">{item.confirm_with.map((x) => <li key={x}>{x}</li>)}</ul>
        {item.response_families.length > 0 && <><p className="mt-2 font-medium text-ink">Response families to evaluate (not recommendations)</p><ul className="list-disc pl-4">{item.response_families.map((x) => <li key={x}>{x}</li>)}</ul></>}
        <p className="mt-2">{item.evidence_needed}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">{item.sources.map((s) => <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className={`rounded-md border px-2 py-1 text-[10px] ${s.reachable ? "border-hairline text-brand" : "border-red-200 text-red-600"}`} title={`${s.publisher} · tier ${s.tier}${s.reachable ? "" : " · not reachable on this run"}`}>{s.title}</a>)}</div></details>
    </article>)}</div>}
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="How deep is poverty?" subtitle="Survey-weighted estimates" inlineHelp info={depth.note}>
        <div className="mt-3 grid grid-cols-2 gap-2"><Tile label="People below the line (est.)" district={depth.district.poor_people.toLocaleString()} national={depth.national.poor_people.toLocaleString()} suffix="" />
          <Tile label="Headcount" district={depth.district.headcount_pct} national={depth.national.headcount_pct} />
          <Tile label="Poverty gap" district={depth.district.poverty_gap_pct} national={depth.national.poverty_gap_pct} />
          <Tile label="Severity" district={depth.district.severity_pct} national={depth.national.severity_pct} /></div>
        <p className="mt-2 text-[10.5px] text-sub">Poor people here fall short of the line by {depth.district.mean_shortfall_among_poor_pct}% on average (Rwanda {depth.national.mean_shortfall_among_poor_pct}%).</p>
      </Card>
      <Card title="Regional or local?" subtitle="Poverty the household factors do not explain, points" inlineHelp info={drivers.place_effect.note}>
        <PlaceEffect place={drivers.place_effect} district={drivers.district} />
      </Card>
    </div>
    <Card title="Who is poor here?" subtitle="Household conditions by share of the district's poor people" inlineHelp info="Poverty rates are shown only where both comparison groups have at least 30 surveyed households. Risk ratio = poverty with the condition ÷ without it.">
      <div className="mt-3 max-h-[340px] overflow-auto"><table className="w-full min-w-[640px] text-left text-[10.5px]"><thead className="sticky top-0 bg-[#F7F9FC] text-sub"><tr>{["Condition", "District %", "Rwanda %", "Poverty with", "Poverty without", "Risk ratio", "Share of poor"].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead>
        <tbody>{drivers.profile.map((row) => <tr key={row.name} className="border-t border-hairline text-ink"><td className="p-2">{row.label}</td><td className="p-2 tabular-nums">{row.district_prevalence_pct}</td><td className="p-2 tabular-nums">{row.national_prevalence_pct}</td>
          {row.status === "Estimated" ? <><td className="p-2 tabular-nums">{row.poverty_with_pct}%</td><td className="p-2 tabular-nums">{row.poverty_without_pct}%</td><td className="p-2 tabular-nums">{row.risk_ratio ?? "—"}</td><td className="p-2 tabular-nums">{row.share_of_district_poor_pct}%</td></> : <td colSpan={4} className="p-2 text-sub">{row.status}</td>}</tr>)}</tbody></table></div>
    </Card>
    <Card title="Further research requests" subtitle="Evidence gaps to close before choosing a response" inlineHelp info="Generated from the leading drivers, the unexplained share, unmeasured subjects and unreachable sources. Requests are tracked in analyst review notes; they do not authorize action.">
      <ul className="mt-3 space-y-2">{diagnosis.research_requests.map((item) => <li key={item.id} className="rounded-md bg-[#F7F9FC] p-2 text-[11px]"><span className="font-semibold text-ink">{item.id} · {item.topic}</span> <span className="text-sub">({item.kind} · {item.owner})</span><p className="mt-0.5 text-ink">{item.question}</p><p className="text-sub">{item.why}</p></li>)}</ul>
      {diagnosis.source_checks.length > 0 && <div className="mt-3 border-t border-hairline pt-3"><p className="text-[11px] font-medium text-ink">Independent cross-checks</p>{diagnosis.source_checks.map((c) => <p key={c.claim} className="mt-1 text-[10.5px] text-sub"><strong className="text-ink">{c.claim}:</strong> ours {c.ours}% vs {c.external}% ({c.source}, {c.external_year}). {c.note}</p>)}</div>}
    </Card>
  </section>;
}
