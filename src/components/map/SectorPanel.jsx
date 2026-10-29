import React, { useMemo } from "react";
import { ArrowLeft, Layers } from "lucide-react";
import { SECTOR_SAMPLE_NOTE, sectorSample } from "@/data/sectorSamples";
import { SECTOR_SHADES } from "@/components/map/ChoroplethMap";

const pct = (value) => `${(value * 100).toFixed(0)}%`;
const short = (name) => ({ "VUP Direct Support": "VUP", "Girinka Munyarwanda": "Girinka", "Expanded Public Works": "Public Works", "Nsymibondo y'Icyaro": "Nsymibondo" }[name] || name);
const HEALTH_TONE = { "Going well": "text-[#067647]", Struggling: "text-[#B54708]", Inactive: "text-[#B42318]" };

function Stat({ label, value, foot, warn }) {
  return <div className="rounded-lg bg-canvas/70 p-2.5"><p className="text-[10.5px] text-sub">{label}</p><p className={`mt-0.5 text-[17px] font-semibold tabular-nums ${warn ? "text-[#B54708]" : "text-ink"}`}>{value}</p><p className="text-[10px] text-sub">{foot}</p></div>;
}

export function SectorLegend({ max }) {
  return <div className="absolute bottom-3 left-3 z-[500] rounded-lg border border-hairline bg-white/95 px-3 py-2 shadow-sm">
    <p className="text-[10.5px] font-medium text-ink">Sample program members per sector</p>
    <div className="mt-1.5 flex items-center gap-1">{SECTOR_SHADES.map((color) => <span key={color} className="h-2.5 w-7 rounded-sm" style={{ backgroundColor: color, border: "1px solid #E3E8EE" }} />)}</div>
    <div className="mt-1 flex justify-between text-[10px] text-sub"><span>none</span><span>{max}+</span></div>
    <p className="mt-1 text-[9.5px] text-[#B54708]">Sample data</p>
  </div>;
}

// The sectors of the district in focus, with the sample programme records found in each.
export default function SectorPanel({ district, sectorGeo, status, index, sector, onSelectSector }) {
  const names = useMemo(() => (sectorGeo ? sectorGeo.features.filter((feature) => feature.properties.district === district).map((feature) => feature.properties.shapeName) : []), [sectorGeo, district]);
  const rows = useMemo(() => names.map((name) => ({ name, data: sectorSample(index, district, name) })).sort((a, b) => (b.data?.enrolled || 0) - (a.data?.enrolled || 0) || a.name.localeCompare(b.name)), [names, index, district]);
  const max = Math.max(1, ...rows.map((row) => row.data?.enrolled || 0));
  const totalPeople = rows.reduce((sum, row) => sum + (row.data?.enrolled || 0), 0);
  const withPeople = rows.filter((row) => row.data?.enrolled).length;
  const unmatched = (index?.unmatched || []).filter((item) => item.district === district);
  const chosen = sector ? rows.find((row) => row.name === sector) : null;
  const detail = chosen?.data;

  return <section aria-label={`Sectors in ${district}`} className="rounded-xl border border-hairline bg-white p-4">
    <div className="flex items-start justify-between gap-2"><div><h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink"><Layers className="h-4 w-4 text-brand" />Sectors in {district}</h3><p className="mt-0.5 text-[11px] text-sub">{status === "loading" ? "Loading sector outlines…" : status === "error" ? "Sector outlines could not be loaded." : `${names.length} sectors · click one on the map or here`}</p></div><span className="shrink-0 rounded-full border border-[#FEDF89] bg-[#FFFAEB] px-2 py-0.5 text-[10px] font-medium text-[#B54708]">Sample data</span></div>

    {!chosen && status === "ready" && <div className="mt-3 flex items-end justify-between rounded-lg bg-canvas/70 px-3 py-2.5"><div><p className="text-[22px] font-semibold leading-none tabular-nums text-ink">{totalPeople}</p><p className="mt-1 text-[11px] text-sub">program members in {district}</p></div><p className="text-right text-[11px] text-sub">in {withPeople} of {names.length} sectors<br />numbers are printed on the map</p></div>}

    {chosen && <div className="mt-3 rounded-lg border border-brand/25 bg-brand-soft/30 p-3">
      <button type="button" onClick={() => onSelectSector(null)} className="mb-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"><ArrowLeft className="h-3 w-3" />All sectors in {district}</button>
      <h4 className="text-[14px] font-semibold text-ink">{chosen.name} sector</h4>
      {!detail ? <p className="mt-2 text-[12px] leading-relaxed text-sub">No sample programme records in this sector. That can mean no programme presence, or that the sample does not include it.</p> : <>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Stat label="Program Members" value={detail.enrolled} foot={`${detail.active} active · ${detail.pending} pending · ${detail.suspended} suspended`} />
          <Stat label="October payment problems" value={detail.payments.total ? pct(detail.problemRate) : "n/a"} foot={`${detail.payments.failed} failed · ${detail.payments.pending} pending of ${detail.payments.total}`} warn={detail.problemRate >= 0.1} />
          <Stat label="Pending or suspended" value={pct(detail.issueShare)} foot="of enrolled program members" warn={detail.issueShare >= 0.18} />
          <Stat label="Health-cover lapses" value={pct(detail.lapseShare)} foot="of program members" />
        </div>
        <p className="mt-3 text-[10.5px] font-medium uppercase tracking-wide text-sub">By programme</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">{Object.entries(detail.programmes).sort((a, b) => b[1] - a[1]).map(([name, count]) => <span key={name} className="rounded-full border border-hairline bg-white px-2 py-0.5 text-[11px] text-ink">{short(name)} <strong className="tabular-nums">{count}</strong></span>)}</div>
      </>}
      {(detail?.hostedCoops.length > 0 || detail?.coopMembers.size > 0) && <>
        <p className="mt-3 text-[10.5px] font-medium uppercase tracking-wide text-sub">Cooperatives</p>
        <ul className="mt-1.5 space-y-1">{detail.hostedCoops.map((coop) => <li key={coop.id} className="flex items-center justify-between gap-2 text-[11.5px]"><span className="min-w-0 truncate text-ink">{coop.name} <span className="text-sub">· {coop.activity}</span></span><span className={`shrink-0 font-medium ${HEALTH_TONE[coop.health]}`}>{coop.health}</span></li>)}
          {[...detail.coopMembers.values()].filter((entry) => !detail.hostedCoops.some((coop) => coop.id === entry.coop.id)).map((entry) => <li key={entry.coop.id} className="text-[11.5px] text-sub">{entry.members} {entry.members === 1 ? "member" : "members"} belong to {entry.coop.name} ({entry.coop.sector})</li>)}</ul>
      </>}
    </div>}

    {!chosen && rows.length > 0 && <ul className="mt-3 max-h-[300px] space-y-0.5 overflow-y-auto pr-1">{rows.map(({ name, data }) => <li key={name}><button type="button" onClick={() => onSelectSector(name)} className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-canvas focus-visible:outline-2 focus-visible:outline-brand">
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{name}</span>
      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-[#EEF1F6] sm:block"><span className="block h-full rounded-full bg-[#14B8A6]" style={{ width: `${((data?.enrolled || 0) / max) * 100}%` }} /></span>
      <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-sub">{data?.enrolled ? `${data.enrolled} people` : "none"}</span></button></li>)}</ul>}

    {unmatched.length > 0 && <p className="mt-3 rounded-md bg-[#FFFAEB] p-2.5 text-[11px] leading-relaxed text-[#B54708]">{unmatched.reduce((sum, item) => sum + item.count, 0)} sample records use sector names that are not official sectors of {district}, so they are not drawn: {unmatched.map((item) => `${item.sector} (${item.count})`).join(", ")}.</p>}
    <p className="mt-3 border-t border-hairline pt-2 text-[10.5px] leading-relaxed text-[#8A94A6]">{SECTOR_SAMPLE_NOTE} Boundaries: geoBoundaries ADM3 (Open Data Rwanda, CC BY 4.0).</p>
  </section>;
}
