import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/analyst/Card";
import { Basis, Legend, ViewTable } from "@/components/analyst/TrendBits";
import { PANEL_MOBILITY, TREND_SOURCES } from "@/data/dashboardTrends";

const SEGMENTS = [
  { key: "stayed_poor", label: "Poor both times", color: "#635BFF" },
  { key: "fell_back", label: "Fell into poverty", color: "#F5A623" },
  { key: "escaped", label: "Escaped poverty", color: "#14B8A6" },
  { key: "never_poor", label: "Not poor either time", color: "#E3E8EE" },
];
const range = (item) => (item ? `${item.ci_lower.toFixed(1)}–${item.ci_upper.toFixed(1)}%` : "n/a");

function Tip({ active = false, payload = [] }) {
  if (!active || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="max-w-[230px] rounded-lg border border-hairline bg-white px-3 py-2 shadow-[0_8px_24px_rgba(10,37,64,0.12)]">
      <p className="text-[12px] font-semibold text-ink">{row.name}</p>
      <p className="text-[10px] text-sub">{row.people.toLocaleString()} people followed</p>
      <ul className="mt-1 space-y-0.5">{SEGMENTS.map((segment) => <li key={segment.key} className="flex items-center gap-1.5 text-[11px] text-sub"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: segment.color }} />{segment.label}<strong className="ml-auto tabular-nums text-ink">{row[segment.key].toFixed(1)}%</strong></li>)}</ul>
    </div>
  );
}

export default function PanelMobilityCard({ province }) {
  const rows = useMemo(() => {
    const all = { name: "All panel people", people: PANEL_MOBILITY.people, ...PANEL_MOBILITY.shares };
    const provinces = PANEL_MOBILITY.byProvince.filter((item) => province === "all" || item.province === province).map((item) => ({ name: item.province, people: item.people, ...item.shares }));
    return [all, ...provinces];
  }, [province]);
  const { escaped, fellInto } = PANEL_MOBILITY;

  return (
    <Card
      title="Who Escaped Poverty?"
      subtitle="The same people followed from 2010/11 to 2013/14."
      info="The EICV3–EICV4 panel re-interviewed the same households. Each bar adds up to 100% of people. Purple and teal show people who were poor in 2010/11; the teal part are those who were no longer poor in 2013/14. Amber shows people who were not poor at first but were poor later. Some movement is measurement error in reported spending, so real movement is probably smaller. Results are provincial because the panel is too small for districts."
      aiInsight={`Of people poor in 2010/11, ${escaped.pct.toFixed(1)}% were not poor in 2013/14; ${fellInto.pct.toFixed(1)}% of those not poor fell into poverty.`}
      aiContext={`NISR EICV3–EICV4 panel, ${PANEL_MOBILITY.people} people in ${PANEL_MOBILITY.households} households followed from 2010/11 to 2013/14, weighted. Among people poor in 2010/11, ${escaped.pct}% were not poor in 2013/14 (95% interval ${range(escaped)}). Among people not poor in 2010/11, ${fellInto.pct}% were poor in 2013/14 (${range(fellInto)}). Shares of all panel people: ${SEGMENTS.map((segment) => `${segment.label} ${PANEL_MOBILITY.shares[segment.key]}%`).join("; ")}. By province: ${PANEL_MOBILITY.byProvince.map((item) => `${item.province}: ${SEGMENTS.map((segment) => `${segment.label} ${item.shares[segment.key]}%`).join(", ")}`).join("; ")}. Poverty status is the household's; consumption measurement error overstates movement; attrition may bias results. Source: ${TREND_SOURCES.trends}.`}
      inlineHelp
    >
      <Basis linked />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-hairline bg-canvas px-3 py-2.5"><p className="text-[10.5px] text-sub">Poor in 2010/11, not poor in 2013/14</p><p className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-ink">{escaped.pct.toFixed(1)}%</p><p className="mt-1 text-[10.5px] text-sub">95% interval {range(escaped)}</p></div>
        <div className="rounded-lg border border-hairline bg-canvas px-3 py-2.5"><p className="text-[10.5px] text-sub">Not poor in 2010/11, poor in 2013/14</p><p className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-ink">{fellInto.pct.toFixed(1)}%</p><p className="mt-1 text-[10.5px] text-sub">95% interval {range(fellInto)}</p></div>
      </div>
      <div className="mt-3"><Legend items={SEGMENTS} /></div>
      <div className="mt-2" role="img" aria-label={`Shares of people by poverty movement. ${rows.map((row) => `${row.name}: ${SEGMENTS.map((segment) => `${segment.label} ${row[segment.key].toFixed(1)} percent`).join(", ")}`).join(". ")}`}>
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(320, rows.length * 110) }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rows} margin={{ top: 16, right: 8, bottom: 2, left: 0 }} barCategoryGap="18%" barGap={2}>
                <CartesianGrid vertical={false} stroke="#EDF1F7" />
                <XAxis dataKey="name" interval={0} tick={{ fontSize: 10.5, fill: "#425466" }} axisLine={{ stroke: "#C9D1DC" }} tickLine={false} />
                <YAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} width={44} tick={{ fontSize: 10, fill: "#8A94A6" }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} cursor={{ fill: "#F7F9FC" }} />
                {SEGMENTS.map((segment) => (
                  <Bar key={segment.key} dataKey={segment.key} name={segment.label} fill={segment.color} stroke={segment.key === "never_poor" ? "#C9D1DC" : "none"} radius={[2, 2, 0, 0]} maxBarSize={22} isAnimationActive={false}>
                    <LabelList dataKey={segment.key} position="top" formatter={(value) => `${Math.round(value)}`} style={{ fontSize: 9, fontWeight: 600, fill: "#425466" }} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <ViewTable head={["Group", "People", ...SEGMENTS.map((segment) => `${segment.label} %`)]} rows={rows.map((row) => [row.name, row.people.toLocaleString(), ...SEGMENTS.map((segment) => row[segment.key].toFixed(1))])} />
      <p className="mt-3 border-t border-hairline pt-2 text-[10.5px] leading-relaxed text-[#8A94A6]">
        Source: NISR EICV3–EICV4 panel, supplied microdata; {PANEL_MOBILITY.people.toLocaleString()} people in {PANEL_MOBILITY.households.toLocaleString()} households. Poverty status is the household's. Part of the movement is measurement error, so real mobility is probably smaller than shown.
      </p>
    </Card>
  );
}
