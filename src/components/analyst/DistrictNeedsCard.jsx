import React, { useMemo } from "react";
import Card from "@/components/analyst/Card";
import { DASHBOARD_SOURCES, NATIONAL_EICV7 } from "@/data/dashboardEvidence";

function Comparison({ label, value, benchmark, description, color, interpretation }) {
  return (
    <div className="rounded-lg border border-hairline bg-canvas/50 p-3">
      <p className="text-[11.5px] font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-[10.5px] leading-snug text-sub">{description}</p>
      <div className="mt-3 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-sub">District <strong className="tabular-nums text-ink">{value.toFixed(1)}%</strong></span>
        <span className="text-sub">Rwanda <strong className="tabular-nums text-ink">{benchmark.toFixed(1)}%</strong></span>
      </div>
      <div className="relative mt-2 h-2.5 rounded-full bg-[#E8ECF3]" role="img" aria-label={`${label}: district ${value.toFixed(1)} percent, Rwanda ${benchmark.toFixed(1)} percent`}>
        <span className="block h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
        <span className="absolute top-[-4px] h-[18px] w-[2px] bg-ink" style={{ left: `${benchmark}%` }} />
      </div>
      <p className="mt-3 text-[10.5px] leading-snug text-sub">{interpretation}</p>
    </div>
  );
}

export default function DistrictNeedsCard({ rows, selectedName, onSelectDistrict, className = "" }) {
  const ordered = useMemo(() => [...rows].sort((a, b) => b.poverty - a.poverty), [rows]);
  const selected = rows.find((row) => row.name === selectedName) || ordered[0];

  return (
    <Card
      title="District Needs"
      subtitle="See where conditions differ from the national average."
      className={className}
      inlineHelp
      info="Choose a district to compare two EICV7 measures with their Rwanda-wide estimates. The dark tick is the national rate. Poverty counts people, while VUP participation counts surveyed poor households. A higher poverty point estimate signals a worse outcome; a higher or lower VUP participation rate is not inherently good or bad without eligibility and other support information. Differences are descriptive, not tests of statistical significance."
      aiInsight="These comparisons identify questions for further investigation. They do not tell us why a district differs or prescribe a programme response."
      aiContext={`NISR EICV7 2023/24. Selected district ${selected.name}. Poverty: ${selected.poverty.toFixed(1)}% of people, Rwanda ${NATIONAL_EICV7.poverty.toFixed(1)}%; higher poverty is less favorable. VUP participation: ${selected.vupAmongPoor.toFixed(1)}% of ${selected.samplePoorHouseholds} surveyed poor households, Rwanda ${NATIONAL_EICV7.vupAmongPoor.toFixed(1)}%; higher or lower participation alone is not inherently good or bad. Do not subtract the two measures. No district confidence intervals or eligibility data are supplied.`}
      action={
        <select aria-label="Choose district for comparison" value={selected.name} onChange={(event) => onSelectDistrict(event.target.value)}
          className="h-7 max-w-[105px] rounded-md border border-hairline bg-white px-1.5 text-[10.5px] text-ink sm:max-w-[140px]">
          {ordered.map((row) => <option key={row.name} value={row.name}>{row.name}</option>)}
        </select>
      }
    >
      <p className="mb-3 text-[11px] text-sub"><strong className="text-ink">{selected.name}</strong> · EICV7 2023/24 · dark tick = Rwanda estimate</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Comparison
          label="Poverty rate"
          value={selected.poverty}
          benchmark={NATIONAL_EICV7.poverty}
          description="Share of residents below the poverty line."
          color="#635BFF"
          interpretation={`The point estimate is ${selected.poverty >= NATIONAL_EICV7.poverty ? "above" : "below"} Rwanda's rate by ${Math.abs(selected.poverty - NATIONAL_EICV7.poverty).toFixed(1)} percentage points. Higher poverty is less favorable.`}
        />
        <Comparison
          label="VUP participation"
          value={selected.vupAmongPoor}
          benchmark={NATIONAL_EICV7.vupAmongPoor}
          description="Share of surveyed poor households reporting a VUP participant."
          color="#14B8A6"
          interpretation={`Based on ${selected.samplePoorHouseholds} surveyed poor households. ${selected.vupAmongPoor >= NATIONAL_EICV7.vupAmongPoor ? "Above" : "Below"} the national estimate; this alone cannot judge programme reach.`}
        />
      </div>
      <p className="mt-3 border-t border-hairline pt-2 text-[10.5px] leading-relaxed text-[#8A94A6]">
        <a href={DASHBOARD_SOURCES.poverty} target="_blank" rel="noreferrer" className="underline underline-offset-2">Source: NISR EICV7</a> · 2023/24. National VUP reference is calculated from the supplied household cross-section. No confidence intervals are available here; small district samples need caution.
      </p>
    </Card>
  );
}
