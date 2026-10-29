import React, { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/analyst/Card";
import { DASHBOARD_SOURCES, NATIONAL_EICV7 } from "@/data/dashboardEvidence";

const METRICS = {
  poverty: { label: "Poverty", max: 60, national: NATIONAL_EICV7.poverty },
  extremePoverty: { label: "Extreme", max: 20, national: NATIONAL_EICV7.extremePoverty },
};

function ChartTip({ active = false, payload = [], metric }) {
  if (!active || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="max-w-[220px] rounded-lg border border-hairline bg-white px-3 py-2 shadow-[0_8px_24px_rgba(10,37,64,0.12)]">
      <p className="text-[12px] font-semibold text-ink">{row.name}</p>
      <p className="mt-1 text-[11px] text-sub">{METRICS[metric].label}: <strong className="tabular-nums text-ink">{row[metric].toFixed(1)}%</strong> of people</p>
      <p className="mt-1 text-[10px] leading-snug text-sub">NISR EICV7, 2023/24 · {row.sampleHouseholds} surveyed households</p>
    </div>
  );
}

export default function PovertyByDistrictChart({ rows, province }) {
  const [metric, setMetric] = useState("poverty");
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(() => [...rows].sort((a, b) => b[metric] - a[metric]), [rows, metric]);
  const visible = showAll ? sorted : sorted.slice(0, 10);
  const highest = sorted[0];
  const scope = province === "all" ? "Rwanda" : province;

  return (
    <Card
      title="Poverty by District"
      subtitle="See which districts have the highest poverty rates."
      info="NISR EICV7 (2023/24): each bar is the share of people in that district below the poverty line, or the extreme poverty line when selected. Longer bars mean a higher rate, not a larger number of people. District estimates have sampling uncertainty; exact confidence intervals are not shown."
      aiInsight={`${highest.name} has the highest ${METRICS[metric].label.toLowerCase()} rate in ${scope} at ${highest[metric].toFixed(1)}%. This is a survey estimate, not a count of people.`}
      aiContext={`NISR EICV7, 2023/24. Geography: ${scope}. Measure: ${METRICS[metric].label} rate, percent of district residents. Rwanda reference: ${METRICS[metric].national.toFixed(1)}%. Districts in current filter: ${sorted.map((row) => `${row.name} ${row[metric].toFixed(1)}% (sample ${row.sampleHouseholds} households)`).join("; ")}. Source: ${DASHBOARD_SOURCES.poverty}. District confidence intervals are not supplied here.`}
      inlineHelp
      action={
        <div className="flex rounded-md bg-[#F1F4F9] p-0.5">
          {Object.entries(METRICS).map(([key, value]) => (
            <button key={key} type="button" aria-pressed={metric === key} onClick={() => setMetric(key)}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${metric === key ? "bg-white text-ink shadow-sm" : "text-sub hover:text-ink"}`}>
              {value.label}
            </button>
          ))}
        </div>
      }
    >
      <p className="mb-2 text-[11px] text-sub">
        Highest in {scope}: <span className="font-medium text-ink">{highest.name}, {highest[metric].toFixed(1)}%</span> · 2023/24
      </p>
      <div role="img" aria-label={`${METRICS[metric].label} rates for ${visible.map((row) => `${row.name} ${row[metric].toFixed(1)}%`).join(", ")}`}>
        <ResponsiveContainer width="100%" height={Math.max(170, visible.length * 28 + 42)}>
          <BarChart data={visible} layout="vertical" margin={{ top: 2, right: 40, bottom: 2, left: 0 }} barCategoryGap="34%">
            <CartesianGrid horizontal={false} stroke="#EDF1F7" />
            <XAxis type="number" domain={[0, METRICS[metric].max]} ticks={metric === "poverty" ? [0, 20, 40, 60] : [0, 10, 20]}
              tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10, fill: "#8A94A6" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={83} interval={0} tick={{ fontSize: 10.5, fill: "#425466" }} axisLine={false} tickLine={false} />
            <ReferenceLine x={METRICS[metric].national} stroke="#8A94A6" strokeDasharray="3 3" />
            <Tooltip content={<ChartTip metric={metric} />} cursor={{ fill: "#F7F9FC" }} />
            <Bar dataKey={metric} fill="#635BFF" radius={[0, 3, 3, 0]} barSize={11}>
              <LabelList dataKey={metric} position="right" formatter={(value) => `${Number(value).toFixed(1)}%`}
                style={{ fontSize: 10, fontWeight: 600, fill: "#0A2540" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-[#8A94A6]">
        <span>Dashed line: Rwanda {METRICS[metric].national.toFixed(1)}%</span>
        {sorted.length > 10 && (
          <button type="button" onClick={() => setShowAll((value) => !value)} className="font-medium text-brand hover:underline">
            {showAll ? "Show top 10" : `Show all ${sorted.length}`}
          </button>
        )}
      </div>
      <p className="mt-2 border-t border-hairline pt-2 text-[10.5px] text-[#8A94A6]">
        <a href={DASHBOARD_SOURCES.poverty} target="_blank" rel="noreferrer" className="underline underline-offset-2">Source: NISR EICV7</a> · 2023/24 · district residents.
      </p>
    </Card>
  );
}
