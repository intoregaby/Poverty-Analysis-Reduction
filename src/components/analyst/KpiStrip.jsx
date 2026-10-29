import React, { useMemo, useState } from "react";
import { NATIONAL_EICV7 } from "@/data/dashboardEvidence";
import * as Tooltip from "@radix-ui/react-tooltip";

function NationalPovertyAverage() {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger asChild onClick={(event) => { event.preventDefault(); setOpen(true); }}>
          <button type="button" className="cursor-pointer rounded-sm text-brand underline decoration-dotted underline-offset-2 hover:decoration-solid focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            national poverty average
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="bottom" sideOffset={8} collisionPadding={12} className="z-[70] w-72 max-w-[calc(100vw-24px)] rounded-lg border border-hairline bg-white p-3 text-[12px] leading-relaxed text-ink shadow-lg">
            Across Rwanda, {NATIONAL_EICV7.poverty.toFixed(1)}% of people live below the poverty line — the amount needed to cover basic needs, such as food.
            <p className="mt-2">Use this countrywide rate to compare districts. It is not the average of the 30 district percentages. It stays the same when you choose a province.</p>
            <p className="mt-2 text-[10.5px] text-sub">Source: NISR EICV7 · 2023/24</p>
            <Tooltip.Arrow className="fill-white" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export default function KpiStrip({ rows, province }) {
  const leading = useMemo(
    () => [...rows].sort((a, b) => b.poverty - a.poverty)[0],
    [rows]
  );
  const aboveNational = rows.filter((row) => row.poverty > NATIONAL_EICV7.poverty).length;
  const scope = province === "all" ? "Rwanda" : province;
  const cards = [
    {
      label: "Rwanda Overview",
      value: `${NATIONAL_EICV7.poverty.toFixed(1)}%`,
      foot: "of people in Rwanda live below the poverty line.",
    },
    {
      label: "Highest Need",
      value: `${leading.poverty.toFixed(1)}%`,
      foot: `${leading.name} District has the highest poverty rate${province === "all" ? " in Rwanda" : ` in ${scope}`}.`,
    },
    {
      label: "District Comparison",
      value: `${aboveNational} out of ${rows.length}`,
      foot: <>districts in {scope} are above the <NationalPovertyAverage />.</>,
    },
    {
      label: "Program Reach",
      value: `${NATIONAL_EICV7.vupAmongPoor.toFixed(1)}%`,
      foot: "of poor households in Rwanda say someone takes part in VUP (Vision Umurenge Programme).",
    },
  ];

  return (
    <div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-hairline bg-white px-4 py-3.5">
          <p className="text-[11.5px] font-medium text-sub">{card.label}</p>
          <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight text-ink tabular-nums">
            {card.value}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-sub">{card.foot}</p>
        </div>
      ))}
    </div>
    <p className="mt-2 text-[10.5px] leading-relaxed text-sub">Source: NISR EICV7 · 2023/24. Figures come from a survey. Use them to guide further checks, not to decide who gets support.</p>
    </div>
  );
}
