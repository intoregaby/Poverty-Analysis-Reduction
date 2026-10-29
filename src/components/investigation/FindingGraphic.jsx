import React from "react";

export default function FindingGraphic({ finding }) {
  const interval = finding.confidence_interval;
  const earlier = finding.earlier_value;
  if (interval || earlier != null) {
    const other = earlier ?? finding.national;
    const lower = interval?.lower ?? Math.min(other, finding.value);
    const upper = interval?.upper ?? Math.max(other, finding.value);
    return <div className="my-3 rounded-lg bg-[#F7F9FC] px-3 py-2 text-[10px] text-sub" role="img" aria-label={`${finding.geography}: ${finding.value}%. ${earlier != null ? `Earlier modelled rate ${earlier}%` : `National rate ${other}%. Published 95% interval ${lower} to ${upper}%`}`}>
      <div className="flex flex-wrap justify-between gap-1"><span>{earlier != null ? `2016/17 modelled: ${other.toFixed(1)}%` : `Rwanda: ${other.toFixed(1)}%`}</span><span>{earlier != null ? "2023/24 observed" : finding.geography}: {finding.value.toFixed(1)}%</span></div>
      <div className="relative my-3 h-1 rounded-full bg-[#E2E8F0]">
        <div className="absolute h-1 rounded-full bg-brand/30" style={{ left: `${lower}%`, width: `${upper - lower}%` }} />
        <span className="absolute -top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-[#8792A2]" style={{ left: `${other}%` }} />
        <span className="absolute -top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-brand" style={{ left: `${finding.value}%` }} />
      </div>
      <div className="flex justify-between"><span>0%</span><span>{interval ? "Band: NISR 95% confidence interval" : "Line connects earlier and latest rates"}</span><span>100%</span></div>
    </div>;
  }
  return <div className="my-3 space-y-2" role="img" aria-label={`${finding.geography} ${finding.value}%, Rwanda ${finding.national}%. ${finding.unit}`}>
    {[[finding.geography, finding.value, "bg-brand"], ["Rwanda", finding.national, "bg-[#A3ADBD]"]].map(([name, value, color]) => <div key={name} className="grid grid-cols-[80px_1fr_40px] items-center gap-2 text-[10px] text-sub"><span className="truncate">{name}</span><div className="h-2 overflow-hidden rounded-full bg-[#F0F3F8]"><div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} /></div><span className="text-right tabular-nums">{Number(value).toFixed(1)}%</span></div>)}
  </div>;
}
