import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/analyst/Card";
import PanelGuide from "@/components/analyst/PanelGuide";

const MIX = [
  { name: "Direct support", value: 2.7 },
  { name: "Classic public works", value: 2.4 },
  { name: "Expanded public works", value: 2.1 },
  { name: "Financial services", value: 2.0 },
];

const FUNNEL = [
  { stage: "Enrolled", value: 24800 },
  { stage: "Payment sent", value: 23410 },
  { stage: "Payment received", value: 22705 },
  { stage: "Verified by agent", value: 19840 },
];

const MONTHS = [
  { m: "Nov", v: 1.42 },
  { m: "Dec", v: 1.51 },
  { m: "Jan", v: 1.38 },
  { m: "Feb", v: 1.61 },
  { m: "Mar", v: 1.58 },
  { m: "Apr", v: 1.72 },
  { m: "May", v: 1.66 },
  { m: "Jun", v: 1.79 },
  { m: "Jul", v: 1.74 },
  { m: "Aug", v: 1.83 },
  { m: "Sep", v: 1.79 },
  { m: "Oct", v: 1.86 },
];

const PROGRAMMES = [
  { name: "VUP Direct Support", hh: "1,430", budget: "RWF 2.4B", delivered: 92, status: "Watch" },
  { name: "Classic public works", hh: "1,260", budget: "RWF 3.1B", delivered: 88, status: "On track" },
  { name: "Expanded public works", hh: "1,104", budget: "RWF 2.7B", delivered: 81, status: "Watch" },
  { name: "Financial services", hh: "1,051", budget: "RWF 0.9B", delivered: 95, status: "On track" },
];

const BADGE = {
  Watch: "bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]",
  "On track": "bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]",
};

function Kpi({ label, value, foot }) {
  return (
    <div className="rounded-xl border border-hairline bg-white px-4 py-3.5">
      <p className="text-[11.5px] font-medium text-sub">{label}</p>
      <p className="mt-1 text-[24px] font-semibold leading-none tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-1.5 text-[11px] text-[#8A94A6]">{foot}</p>
    </div>
  );
}

export default function ProgrammeEvidence() {
  const max = FUNNEL[0].value;

  return (
    <div className="pb-14">
      <PageHeader
        title="Programme Results"
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FEDF89] bg-[#FFFAEB] px-2 py-[3px] text-[10.5px] font-medium text-[#B54708]">
            Sample data
          </span>
        }
      />

      <PanelGuide id="programme-results" title="Programme Results">
        This page tracks how social protection programmes are performing. See payments delivered, who
        received them, and which programmes are on track or need attention.
      </PanelGuide>

      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4">
          <h2 className="text-[20px] font-semibold tracking-tight text-ink">Programme Results</h2>
          <p className="mt-0.5 text-[12px] text-sub">How aid programmes are performing</p>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi label="Households in VUP" value="1,430" foot="8.8% coverage · 2023/24" />
          <Kpi label="Payments this month" value="RWF 1.86B" foot="across 4 programmes" />
          <Kpi label="Reached, verified" value="80%" foot="19,840 of 24,800 enrolled" />
          <Kpi label="Active agents" value="312" foot="1 agent per 79 households" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card
            tour="ev-payments" title="Payments Delivered"
            subtitle="Money sent to families each month"
            info="This chart shows how much money was paid out each month across all programmes. The line going up means more families are being reached."
            aiInsight="This chart tracks monthly payments across all programmes. An upward trend means more families are receiving aid. Sudden drops may indicate payment delays or programme issues."
            className="xl:col-span-2"
          >
            <ResponsiveContainer width="100%" height={226}>
              <AreaChart data={MONTHS} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
                <defs>
                  <linearGradient id="payFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#635BFF" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#635BFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#EDF1F7" />
                <XAxis dataKey="m" tick={{ fontSize: 10.5, fill: "#8A94A6" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10.5, fill: "#8A94A6" }} axisLine={false} tickLine={false} domain={[0, 2]} />
                <Tooltip
                  formatter={(v) => [`RWF ${Number(v).toFixed(2)}B`, "Delivered"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E3E8EE", fontSize: 11 }}
                />
                <Area type="monotone" dataKey="v" stroke="#635BFF" strokeWidth={2} fill="url(#payFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card
            tour="ev-journey" title="Payment Journey"
            subtitle="From enrolled to money received"
            info="This shows how many families make it through each step — from enrolled to actually receiving the money. A big drop between steps means people are falling through the cracks."
            aiInsight="This funnel shows where families drop off between enrolment and receiving money. The biggest gap between 'Payment sent' and 'Verified by agent' means many payments aren't being confirmed on the ground."
          >
            <ul className="space-y-3">
              {FUNNEL.map((f, i) => {
                const pct = (f.value / max) * 100;
                return (
                  <li key={f.stage}>
                    <div className="flex items-baseline justify-between text-[11.5px]">
                      <span className="text-sub">{f.stage}</span>
                      <span className="font-medium tabular-nums text-ink">{f.value.toLocaleString()}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F1F4F9]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: "#635BFF", opacity: 0.9 - i * 0.18 }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card
            tour="ev-mix" title="Programme Mix"
            subtitle="Which programmes reach the most families"
            info="This shows how families are split across the four main programmes. Longer bars mean more families are reached by that programme."
            aiInsight="This chart shows the share of families reached by each programme. 'Direct support' reaches the most families. Use this to see if one programme is doing most of the heavy lifting."
          >
            <ResponsiveContainer width="100%" height={188}>
              <BarChart data={MIX} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap="28%">
                <CartesianGrid horizontal={false} stroke="#EDF1F7" />
                <XAxis
                  type="number"
                  domain={[0, 4]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 10, fill: "#8A94A6" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 10, fill: "#425466" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#F7F9FC" }}
                  formatter={(v) => [`${Number(v).toFixed(1)}%`, ""]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E3E8EE", fontSize: 11 }}
                />
                <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={8}>
                  {MIX.map((m, i) => (
                    <Cell key={m.name} fill={i === 0 ? "#635BFF" : "#B3ADFF"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card
            tour="ev-table" title="Programme Performance"
            subtitle="Budget, delivery and status"
            info="This table shows each programme's budget, how many families it reaches, and whether it's on track. 'Watch' means it needs attention."
            aiInsight="This table compares all four programmes. 'Delivered' shows what share of the budget actually reached families. Programmes marked 'Watch' are behind schedule and need attention."
            className="xl:col-span-2"
            bodyClassName="px-0 pb-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-y border-hairline bg-[#FAFBFD] text-[10.5px] uppercase tracking-[0.06em] text-[#8A94A6]">
                    <th className="py-2 pl-5 pr-3 text-left font-medium">Programme</th>
                    <th className="px-3 py-2 text-right font-medium">Households</th>
                    <th className="px-3 py-2 text-right font-medium">Budget</th>
                    <th className="px-3 py-2 text-right font-medium">Delivered</th>
                    <th className="py-2 pl-3 pr-5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {PROGRAMMES.map((p) => (
                    <tr key={p.name} className="border-b border-hairline/70 last:border-0 hover:bg-[#FAFBFD]">
                      <td className="py-2.5 pl-5 pr-3 font-medium text-ink">{p.name}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-sub">{p.hh}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-sub">{p.budget}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink">{p.delivered}%</td>
                      <td className="py-2.5 pl-3 pr-5 text-right">
                        <span className={`inline-flex rounded-full border px-2 py-[2px] text-[10.5px] font-medium ${BADGE[p.status]}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <p className="mt-5 text-[10.5px] text-[#8A94A6]">
          Coverage figures from NISR VUP 2023/24. Payment, agent and budget values are sample data for the demo.
        </p>
      </div>
    </div>
  );
}