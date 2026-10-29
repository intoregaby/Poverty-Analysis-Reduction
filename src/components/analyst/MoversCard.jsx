import React, { useMemo, useState } from "react";
import Card from "@/components/analyst/Card";
import { DASHBOARD_SOURCES } from "@/data/dashboardEvidence";

const SCALE_MAX = 75;

export default function MoversCard({ rows }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.publishedDecrease - a.publishedDecrease),
    [rows]
  );
  const visible = showAll ? sorted : sorted.slice(0, 8);

  return (
    <Card
      title="Poverty Changes"
      subtitle="See where poverty increased or decreased over time."
      info="Each line connects the modelled 2016/17 poverty rate (outlined dot) with the observed 2023/24 rate (solid dot). The change is in percentage points, not percent. NISR modelled 2016/17 using the EICV7 method because direct comparison with the original EICV5 poverty figures is invalid. District uncertainty is substantial, so a lower point estimate does not always prove a real decrease."
      aiInsight="The chart shows published, method-adjusted point estimates. NISR reports that only 17 of 30 district reductions are statistically distinguishable from no change at the 95% level."
      aiContext={`NISR EICV7 Poverty Profile, Annex B. Earlier rates are 2016/17 modelled onto the EICV7 method; latest rates are observed 2023/24. All rates are percent of people; published changes are percentage-point decreases calculated before rounding. Districts in the current filter: ${sorted.map((row) => `${row.name}: modelled ${row.previousModelled.toFixed(1)}%, latest ${row.poverty.toFixed(1)}%, published decrease ${row.publishedDecrease.toFixed(1)} points`).join("; ")}. Only 17 of 30 national district reductions are statistically clear at 95%; this chart does not identify which 17. Source: ${DASHBOARD_SOURCES.change}.`}
      inlineHelp
    >
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-sub">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-[#A6A2E8] bg-white" /> 2016/17 modelled</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand" /> 2023/24 observed</span>
      </div>
      <ol className="divide-y divide-hairline/70">
        {visible.map((row) => {
          const change = row.poverty - row.previousModelled;
          const direction = change > 0 ? "increase" : change < 0 ? "decrease" : "no change";
          const start = Math.min(row.poverty, row.previousModelled) / SCALE_MAX * 100;
          const width = Math.abs(change) / SCALE_MAX * 100;
          return (
            <li key={row.name} className="grid grid-cols-[80px_minmax(80px,1fr)_84px] items-center gap-2 py-2.5 sm:grid-cols-[115px_minmax(100px,1fr)_148px] sm:gap-3"
              aria-label={`${row.name}: ${row.previousModelled.toFixed(1)} percent modelled in 2016/17, ${row.poverty.toFixed(1)} percent in 2023/24, ${row.publishedDecrease.toFixed(1)} published percentage point ${direction}`}>
              <span className="break-words text-[11px] font-medium leading-tight text-ink sm:text-[12px]">{row.name}</span>
              <div className="relative h-5" title={`${row.previousModelled.toFixed(1)}% modelled → ${row.poverty.toFixed(1)}% observed`}>
                <div className="absolute inset-x-0 top-[9px] h-[2px] bg-[#EDF1F7]" />
                <div className={`absolute top-[8px] h-1 rounded-full ${change > 0 ? "bg-[#F5A623]" : "bg-[#A6A2E8]"}`} style={{ left: `${start}%`, width: `${width}%` }} />
                <span className="absolute top-[4px] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[#A6A2E8] bg-white" style={{ left: `${row.previousModelled / SCALE_MAX * 100}%` }} />
                <span className="absolute top-[4px] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-brand shadow-[0_0_0_1px_#635BFF]" style={{ left: `${row.poverty / SCALE_MAX * 100}%` }} />
              </div>
              <span className="text-right text-[10.5px] tabular-nums text-ink sm:text-[11.5px]">
                <span className="block">{row.previousModelled.toFixed(1)} → {row.poverty.toFixed(1)}%</span>
                <span className={`font-medium ${change > 0 ? "text-[#B54708]" : "text-pos"}`}>{row.publishedDecrease.toFixed(1)} pt {direction}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {sorted.length > 8 && (
        <button type="button" onClick={() => setShowAll((value) => !value)} className="mt-2 text-[11px] font-medium text-brand hover:underline">
          {showAll ? "Show largest 8 changes" : `Show all ${sorted.length} districts`}
        </button>
      )}
      <p className="mt-3 border-t border-hairline pt-2 text-[10.5px] leading-relaxed text-[#8A94A6]">
        <a href={DASHBOARD_SOURCES.change} target="_blank" rel="noreferrer" className="underline underline-offset-2">Source: NISR EICV7 Poverty Profile, Annex B</a> · people below the poverty line. Earlier rates are modelled on the new method. Changes use NISR's published percentage points and may differ by 0.1 from the displayed rounded rates. District confidence intervals are not shown; NISR finds statistically clear reductions in 17 of 30 districts.
      </p>
    </Card>
  );
}
