import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Target } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/analyst/Card";
import PanelGuide from "@/components/analyst/PanelGuide";
import { DASHBOARD_DISTRICTS, FINANCIAL_ACCESS_NATIONAL, NATIONAL_EICV7 } from "@/data/dashboardEvidence";

const access = Object.fromEntries(FINANCIAL_ACCESS_NATIONAL.map((part) => [part.key, part.value]));
const formallyIncluded = access.banked + access.otherFormal;
const inTheGap = (row) => row.poverty >= 40 && row.vupAmongPoor < 15;

export default function Nst2Indicators() {
  const critical = useMemo(() => DASHBOARD_DISTRICTS.filter(inTheGap).length, []);

  const pillars = [
    {
      name: "Social transformation",
      note: "Poverty and social protection",
      rows: [
        { label: "Poverty rate", value: `${NATIONAL_EICV7.poverty.toFixed(1)}%`, year: "2023/24" },
        { label: "Extreme poverty", value: `${NATIONAL_EICV7.extremePoverty.toFixed(1)}%`, year: "2023/24" },
        { label: "VUP participation, poor households", value: `${NATIONAL_EICV7.vupAmongPoor.toFixed(1)}%`, year: "2023/24" },
        { label: "Households reporting VUP participation", value: `${NATIONAL_EICV7.vupAmongAllHouseholds.toFixed(1)}%`, year: "2023/24" },
      ],
    },
    {
      name: "Economic transformation",
      note: "Financial inclusion",
      rows: [
        { label: "Formally included", value: `${formallyIncluded}%`, year: "2024" },
        { label: "Financially excluded", value: `${access.excluded}%`, year: "2024" },
        { label: "Banked", value: `${access.banked}%`, year: "2024" },
        { label: "Informal only", value: `${access.informalOnly}%`, year: "2024" },
      ],
    },
    {
      name: "Transformational governance",
      note: "Evidence and delivery",
      rows: [
        { label: "Districts with data", value: "30 / 30", year: "2024" },
        { label: "Districts with poverty 40%+ and VUP participation under 15% of poor", value: critical.toString(), year: "2023/24" },
        { label: "Programmes tracked", value: "4", year: "2024" },
        { label: "Payment traceability", value: "Per household", year: "2024" },
      ],
    },
  ];

  const chart = [
    { name: "Poverty", value: NATIONAL_EICV7.poverty },
    { name: "Extreme", value: NATIONAL_EICV7.extremePoverty },
    { name: "Formal", value: formallyIncluded },
    { name: "Excluded", value: access.excluded },
    { name: "VUP, poor", value: NATIONAL_EICV7.vupAmongPoor },
  ];

  return (
    <div className="pb-14">
      <PageHeader
        title="National Goals"
        badge={
          <span className="hidden items-center gap-1.5 rounded-full border border-hairline px-2 py-[3px] text-[11px] text-sub sm:inline-flex">
            <Target className="h-3 w-3 text-brand" />
            2024–2029
          </span>
        }
      />

      <PanelGuide id="nst2-goals" title="National Goals">
        Rwanda set national development targets for 2024–2029. This page shows whether current data
        meets those targets. "Target pending" means the official number hasn't been set yet.
      </PanelGuide>

      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4" data-tour="nst2-intro">
          <h2 className="text-[20px] font-semibold tracking-tight text-ink">Rwanda's National Goals</h2>
          <p className="mt-0.5 text-[12px] text-sub">Are we meeting the 2024–2029 targets?</p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="flex flex-col gap-4 xl:col-span-2">
            {pillars.map((p) => (
              <Card key={p.name} title={p.name} subtitle={p.note} info="This is one group of national goals. Each row is one number, with its target." bodyClassName="px-0 pb-0">
                <div className="border-t border-hairline">
                  {p.rows.map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center gap-3 border-b border-hairline/70 px-5 py-2.5 last:border-0 hover:bg-[#FAFBFD]"
                    >
                      <span className="flex-1 text-[12px] text-ink">{r.label}</span>
                      <span className="text-[10.5px] tabular-nums text-[#8A94A6]">{r.year}</span>
                      <span className="w-16 text-right text-[12.5px] font-medium tabular-nums text-ink">{r.value}</span>
                      <span className="w-[92px] text-right">
                        <span className="inline-flex rounded-full border border-hairline bg-[#FAFBFD] px-2 py-[2px] text-[10px] font-medium text-[#8A94A6]">
                          target pending
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <Card
              tour="nst2-latest" title="Latest Numbers"
              subtitle="Key figures from the latest survey"
              info="A quick snapshot of the most important numbers across all national goals. Each bar shows one key indicator as a percentage."
              aiInsight="This chart shows the latest values for five key national indicators. Compare them to see where Rwanda stands. Lower poverty and exclusion are better; higher formal access and coverage are better."
            >
              <ResponsiveContainer width="100%" height={196}>
                <BarChart data={chart} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap="30%">
                  <CartesianGrid horizontal={false} stroke="#EDF1F7" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10, fill: "#8A94A6" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={72}
                    tick={{ fontSize: 10.5, fill: "#425466" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#F7F9FC" }}
                    formatter={(v) => [`${Number(v).toFixed(1)}%`, ""]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E3E8EE", fontSize: 11 }}
                  />
                  <Bar dataKey="value" fill="#635BFF" radius={[0, 3, 3, 0]} barSize={9} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card
              tour="nst2-targets" title="Targets"
              subtitle="Official goals for 2024–2029"
              info="National targets, baselines and milestone years will appear here once the official NST2 indicator file is added. Current values already come from NISR survey data."
            >
              <p className="text-[11.5px] leading-relaxed text-sub">
                National targets, baselines and milestone years will load here once the NST2 indicator
                file is added. Current values already come from the NISR files.
              </p>
            </Card>
          </div>
        </div>

        <p className="mt-5 text-[10.5px] text-[#8A94A6]">
          NST2 (2024–2029) · Vision 2050. Poverty and VUP figures are calculated from NISR EICV7 2023/24 (VUP is reported participation, not payments or eligibility); financial inclusion is the published national FinScope 2024 result.
        </p>
      </div>
    </div>
  );
}