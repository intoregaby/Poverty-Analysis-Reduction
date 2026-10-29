import React, { useState } from "react";
import { SORTERS, sortRows } from "@/lib/povertySupport";
import { COLORS, DistrictFacts, Legend, Swatch } from "./shared";

const AXIS_STEP = 10;
const SOURCE = "NISR EICV7, 2023/24";

export default function CompareChart({ rows, national, selectedName, onSelect }) {
  const [sortKey, setSortKey] = useState("poverty");
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState(null);
  const sorted = sortRows(rows, sortKey);
  const visible = showAll ? sorted : sorted.slice(0, 10);
  const max = Math.ceil(Math.max(...rows.flatMap((row) => [row.poverty, row.vupAmongPoor]), 1) / AXIS_STEP) * AXIS_STEP;
  const ticks = Array.from({ length: max / AXIS_STEP + 1 }, (_, index) => index * AXIS_STEP);
  const pos = (value) => `${(value / max) * 100}%`;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Legend>
          <Swatch color={COLORS.poverty}>Poverty · % of people</Swatch>
          <Swatch color={COLORS.vup}>VUP · % of poor households</Swatch>
        </Legend>
        <label className="flex items-center gap-1.5 text-[11px] text-sub">Sort by
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}
            className="h-7 rounded-md border border-hairline bg-white px-1.5 text-[11px] text-ink focus-visible:outline-2 focus-visible:outline-brand">
            {["poverty", "vup", "name"].map((key) => <option key={key} value={key}>{SORTERS[key].label}</option>)}
          </select>
        </label>
      </div>
      <p className="mb-3 rounded-lg bg-canvas px-3 py-2 text-[11px] leading-relaxed text-sub">
        Each row is a district. The purple dot is the poverty rate and the teal dot is VUP participation. They count different groups (people and poor households), so the distance between the dots is <strong className="font-medium text-ink">not</strong> a coverage gap.
      </p>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-[84px] right-2 sm:left-[116px]" aria-hidden="true">
          {ticks.map((tick) => <span key={tick} className="absolute inset-y-0 border-l border-hairline/80" style={{ left: pos(tick) }} />)}
          <span className="absolute inset-y-0 border-l border-dashed" style={{ left: pos(national.poverty), borderColor: COLORS.poverty, opacity: 0.55 }} />
          <span className="absolute inset-y-0 border-l border-dashed" style={{ left: pos(national.vupAmongPoor), borderColor: COLORS.vup }} />
        </div>
        <ul className="relative">
          {visible.map((row) => {
            const low = Math.min(row.poverty, row.vupAmongPoor);
            const high = Math.max(row.poverty, row.vupAmongPoor);
            const selected = selectedName === row.name;
            return (
              <li key={row.name} className="relative">
                <button type="button" aria-pressed={selected}
                  aria-label={`${row.name}: poverty ${row.poverty.toFixed(1)} percent of people, VUP participation ${row.vupAmongPoor.toFixed(1)} percent of poor households`}
                  onClick={() => { onSelect(selected ? null : row.name); setActive(row.name); }}
                  onMouseEnter={() => setActive(row.name)} onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(row.name)} onBlur={() => setActive(null)}
                  className={`flex h-7 w-full items-center rounded text-left focus-visible:outline-2 focus-visible:outline-brand ${selected ? "bg-brand-soft" : "hover:bg-canvas"}`}>
                  <span className={`w-[84px] shrink-0 truncate pl-1.5 pr-2 text-[11.5px] sm:w-[116px] ${selected ? "font-semibold text-ink" : "font-medium text-ink"}`}>{row.name}</span>
                  <span className="relative mr-2 h-full flex-1" aria-hidden="true">
                    <span className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full" style={{ left: pos(low), width: `${((high - low) / max) * 100}%`, backgroundColor: COLORS.connector }} />
                    <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white" style={{ left: pos(row.poverty), backgroundColor: COLORS.poverty }} />
                    <span className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${row.quality.key === "small" ? "opacity-60" : ""}`} style={{ left: pos(row.vupAmongPoor), backgroundColor: COLORS.vup }} />
                  </span>
                </button>
                {active === row.name && (
                  <div role="tooltip" className="pointer-events-none absolute left-[84px] top-full z-20 w-60 rounded-lg border border-hairline bg-white p-2.5 shadow-[0_8px_24px_rgba(10,37,64,0.14)] sm:left-[116px]">
                    <DistrictFacts row={row} national={national} source={SOURCE} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="ml-[84px] mr-2 mt-1 flex justify-between text-[10px] tabular-nums text-[#8A94A6] sm:ml-[116px]" aria-hidden="true">
          {ticks.map((tick) => <span key={tick}>{tick}%</span>)}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-[#8A94A6]">
        <Legend>
          <Swatch color={COLORS.poverty} line>National poverty {national.poverty.toFixed(1)}%</Swatch>
          <Swatch color={COLORS.vup} line>National VUP {national.vupAmongPoor.toFixed(1)}%</Swatch>
          <span>Faded teal dot = small sample (under 50 poor households)</span>
        </Legend>
        {rows.length > 10 && <button type="button" onClick={() => setShowAll((value) => !value)} className="font-medium text-brand hover:underline">{showAll ? "Show top 10" : `Show all ${rows.length}`}</button>}
      </div>
    </div>
  );
}
