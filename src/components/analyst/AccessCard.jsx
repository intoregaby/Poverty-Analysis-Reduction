import React from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import Card from "@/components/analyst/Card";
import { DASHBOARD_SOURCES, FINANCIAL_ACCESS_NATIONAL } from "@/data/dashboardEvidence";

export default function AccessCard({ province }) {
  return (
    <Card
      title="Financial Inclusion"
      subtitle="See how adults use financial services in Rwanda."
      info="The whole pie represents 100 adults across Rwanda in FinScope 2024. Each slice shows one group: bank services, other formal services without a bank account, informal services only, or no financial services. Each adult is counted once. These are national adult estimates, even when a province is selected."
      aiInsight="FinScope 2024 estimates that 96 of every 100 Rwandan adults use at least one formal or informal financial service; 4 use neither."
      aiContext={`Rwanda-wide FinScope 2024 Access Strand for adults aged 16+. Mutually exclusive categories: banked 22%, other formal but not banked 70%, informal only 4%, financially excluded 4%. Included in any service: 96% or approximately 7.8 million adults. These are national estimates${province === "all" ? "" : `; the ${province} filter does not change their geography`}. Source: ${DASHBOARD_SOURCES.financial}. Do not infer district values.`}
      inlineHelp
    >
      <div className="rounded-lg border border-hairline bg-canvas px-3 py-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#8A94A6]">Rwanda · FinScope 2024</p>
            <p className="mt-1 text-[20px] font-semibold leading-none text-ink tabular-nums">96 in 100 <span className="text-[11px] font-normal text-sub">adults use a service</span></p>
          </div>
          <span className="text-[11px] text-sub">≈7.8 million adults</span>
        </div>
      </div>
      {province !== "all" && (
        <p className="mt-2 rounded-md border border-[#FEDF89] bg-[#FFFAEB] px-2.5 py-1.5 text-[11px] text-[#93570A]">
          National coverage only: the {province} filter does not change these figures.
        </p>
      )}
      <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
        <div role="img" aria-label="Financial inclusion pie chart. Among 100 Rwandan adults: 22 use bank services, 70 use other formal services but are not banked, 4 use informal services only, and 4 use no financial service."
          className="shrink-0">
          <PieChart width={184} height={184}>
            <Pie data={FINANCIAL_ACCESS_NATIONAL} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={84}
              startAngle={90} endAngle={-270} stroke="#FFFFFF" strokeWidth={2} isAnimationActive={false}
              labelLine={false} label={({ cx, cy, midAngle, value }) => {
                if (value < 10) return null;
                const angle = -midAngle * Math.PI / 180;
                return <text x={cx + 55 * Math.cos(angle)} y={cy + 55 * Math.sin(angle)} textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontSize={12} fontWeight={600}>{value}%</text>;
              }}>
              {FINANCIAL_ACCESS_NATIONAL.map((part) => <Cell key={part.key} fill={part.color} />)}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value}% of adults`, name]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E3E8EE", fontSize: 11, color: "#0A2540", boxShadow: "0 8px 24px rgba(10,37,64,0.12)" }} />
          </PieChart>
        </div>
        <ul className="grid w-full min-w-0 grid-cols-1 gap-y-3">
          {FINANCIAL_ACCESS_NATIONAL.map((part) => (
            <li key={part.key} className="flex items-center gap-2 text-[11.5px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-black/5" style={{ backgroundColor: part.color }} />
              <span className="text-sub">{part.label}</span>
              <strong className="ml-auto tabular-nums text-ink">{part.value}%</strong>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 border-t border-hairline pt-2 text-[10.5px] leading-relaxed text-[#8A94A6]">
        <a href={DASHBOARD_SOURCES.financial} target="_blank" rel="noreferrer" className="underline underline-offset-2">Source: Rwanda FinScope 2024</a> · nationally surveyed adults aged 16+. Categories do not overlap; figures use the published Access Strand.
      </p>
    </Card>
  );
}
