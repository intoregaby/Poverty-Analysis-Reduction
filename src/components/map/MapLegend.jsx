import React from "react";
import { MAP_LAYERS, MARKER_COLORS, NO_DATA } from "@/lib/mapLayers";

export default function MapLegend({ layer }) {
  const config = MAP_LAYERS[layer];
  return (
    <div data-tour="map-legend" className="pointer-events-none absolute bottom-3 left-3 z-[500] max-w-[210px] rounded-lg border border-hairline bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
      <p className="text-[10.5px] font-medium text-ink">{config.label}{config.unit && <span className="font-normal text-sub"> · {config.unit}</span>}</p>
      {config.categorical ? (
        <ul className="mt-1.5 space-y-1">
          {Object.values(MARKER_COLORS).map((item) => (
            <li key={item.label} className="flex items-center gap-1.5 text-[10px] text-sub">
              <span aria-hidden="true" className="h-2.5 w-4 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />{item.label}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="mt-1.5 flex overflow-hidden rounded-sm" aria-hidden="true">
            {config.ramp.map((color) => <span key={color} className="h-2 flex-1" style={{ backgroundColor: color }} />)}
          </div>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[#8A94A6]">
            <span>{config.domain[0]}%</span>
            <span>{config.domain[1]}%+</span>
          </div>
          <p className="mt-1 text-[10px] text-sub">Darker = higher</p>
        </>
      )}
      <p className="mt-1 flex items-center gap-1.5 text-[10px] text-sub">
        <span aria-hidden="true" className="h-2.5 w-4 shrink-0 rounded-sm border border-hairline" style={{ backgroundColor: NO_DATA }} />No data
      </p>
      {layer === "vup" && <p className="mt-1 text-[10px] text-sub">Dashed outline = small sample</p>}
    </div>
  );
}
