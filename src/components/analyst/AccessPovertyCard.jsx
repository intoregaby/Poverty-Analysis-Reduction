import React, { useMemo, useState } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import Card from "@/components/analyst/Card";
import { Basis, Legend, Segmented, ViewTable } from "@/components/analyst/TrendBits";
import { ACCESS_DISTRICTS, ACCESS_LINKS, linkReading } from "@/data/dashboardTrends";
import { DASHBOARD_SOURCES } from "@/data/dashboardEvidence";

const MEASURES = {
  excluded: { label: "No financial service", axis: "Adults using no financial service (%)", link: "excludedPublished", read: (row) => row.published.excluded, basis: "published by NISR" },
  banked: { label: "Bank services", axis: "Adults using bank services (%)", link: "bankedPublished", read: (row) => row.published.banked, basis: "published by NISR" },
  mobile: { label: "Mobile money", axis: "Adults using mobile money (%, estimated)", link: "mobileMoneyEstimated", read: (row) => row.mobileMoneyEstimated, basis: "estimated from the FinScope microdata, not a published district figure" },
};
const HIGHLIGHT = "#635BFF";
const MUTED = "#A3ADBD";

function Tip({ active = false, payload = [], measure }) {
  if (!active || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="max-w-[220px] rounded-lg border border-hairline bg-white px-3 py-2 shadow-[0_8px_24px_rgba(10,37,64,0.12)]">
      <p className="text-[12px] font-semibold text-ink">{row.name}</p>
      <p className="mt-1 text-[11px] text-sub">{MEASURES[measure].label}: <strong className="tabular-nums text-ink">{row.x.toFixed(1)}%</strong></p>
      <p className="text-[11px] text-sub">Poverty 2023/24: <strong className="tabular-nums text-ink">{row.y.toFixed(1)}%</strong></p>
    </div>
  );
}

export default function AccessPovertyCard({ rows, province }) {
  const [measure, setMeasure] = useState("excluded");
  const names = useMemo(() => new Set(rows.map((row) => row.name)), [rows]);
  const points = useMemo(() => ACCESS_DISTRICTS.map((row) => ({ name: row.name, x: MEASURES[measure].read(row), y: row.poverty, inView: names.has(row.name) })), [measure, names]);
  const link = ACCESS_LINKS[MEASURES[measure].link];
  const [low, high] = link.bootstrap_95_interval;
  const highlighted = points.filter((point) => point.inView);
  const others = points.filter((point) => !point.inView);
  const xMax = Math.ceil(Math.max(...points.map((point) => point.x)) / 10) * 10;

  return (
    <Card
      title="Financial Inclusion and Poverty"
      subtitle="Do districts with less financial access also have higher poverty?"
      info="Each dot is one district. The vertical position is its poverty rate from EICV7; the horizontal position is how adults use financial services in FinScope 2024. The two surveys interviewed different people, so this compares district averages only. The correlation number runs from -1 to 1; the range shows how uncertain it is across 30 districts. A pattern between districts does not show that financial access changes poverty or the reverse."
      aiInsight={`Across 30 districts the rank correlation between ${MEASURES[measure].label.toLowerCase()} and poverty is ${link.spearman_rho.toFixed(2)} (range ${low.toFixed(2)} to ${high.toFixed(2)}). ${linkReading(link)}`}
      aiContext={`District averages from two separate surveys, not linked by household: EICV7 2023/24 poverty and FinScope 2024. Measure: ${MEASURES[measure].label} (${MEASURES[measure].basis}). Rank correlation ${link.spearman_rho} with bootstrap 95% range ${low} to ${high} across 30 districts. ${linkReading(link)} Points: ${points.map((point) => `${point.name}: ${point.x}% vs poverty ${point.y}%`).join("; ")}. Sources: ${DASHBOARD_SOURCES.poverty}; ${DASHBOARD_SOURCES.financial}. Association only; no causal claim.`}
      inlineHelp
    >
      <Basis />
      <Segmented label="Measure compared with poverty" value={measure} onChange={setMeasure} options={Object.entries(MEASURES).map(([key, value]) => ({ key, label: value.label }))} />
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink">Rank correlation across 30 districts: <strong className="tabular-nums">{link.spearman_rho.toFixed(2)}</strong> <span className="text-sub">(range {low.toFixed(2)} to {high.toFixed(2)})</span>. <span className="text-sub">{linkReading(link)}</span></p>
      <div className="mt-2"><Legend items={[{ label: province === "all" ? "District" : `${province} districts`, color: HIGHLIGHT }, ...(province === "all" ? [] : [{ label: "Other districts", color: MUTED }])]} /></div>
      <div className="mt-2" role="img" aria-label={`Scatter of ${MEASURES[measure].label.toLowerCase()} against poverty for 30 districts. Rank correlation ${link.spearman_rho.toFixed(2)}, range ${low.toFixed(2)} to ${high.toFixed(2)}.`}>
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 22, left: 0 }}>
            <CartesianGrid stroke="#EDF1F7" />
            <XAxis type="number" dataKey="x" domain={[0, xMax]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10, fill: "#8A94A6" }} axisLine={false} tickLine={false} label={{ value: MEASURES[measure].axis, position: "insideBottom", offset: -12, fontSize: 10.5, fill: "#425466" }} />
            <YAxis type="number" dataKey="y" domain={[0, 60]} ticks={[0, 20, 40, 60]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10, fill: "#8A94A6" }} axisLine={false} tickLine={false} width={40} />
            <ZAxis range={[70, 70]} />
            <Tooltip content={<Tip measure={measure} />} cursor={{ strokeDasharray: "3 3", stroke: "#C9D1DC" }} />
            {others.length > 0 && <Scatter data={others} fill={MUTED} stroke="#FFFFFF" strokeWidth={2} isAnimationActive={false} />}
            <Scatter data={highlighted} fill={HIGHLIGHT} stroke="#FFFFFF" strokeWidth={2} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10.5px] text-[#8A94A6]">Vertical axis: poverty, % of people, EICV7 2023/24. Horizontal: {MEASURES[measure].basis}.</p>
      <ViewTable head={["District", `${MEASURES[measure].label} %`, "Poverty %"]} rows={[...points].sort((a, b) => b.y - a.y).map((point) => [point.name, point.x.toFixed(1), point.y.toFixed(1)])} />
      <p className="mt-3 border-t border-hairline pt-2 text-[10.5px] leading-relaxed text-[#8A94A6]">
        Sources: <a href={DASHBOARD_SOURCES.poverty} target="_blank" rel="noreferrer" className="underline underline-offset-2">NISR EICV7</a> and <a href={DASHBOARD_SOURCES.financial} target="_blank" rel="noreferrer" className="underline underline-offset-2">Rwanda FinScope 2024</a>. Two separate surveys compared by district; an association, not a cause. Mobile money by district is estimated from the supplied microdata because NISR does not publish it.
      </p>
    </Card>
  );
}
