import React from "react";
import { Truck } from "lucide-react";
import { DELIVERY_NOTE, districtDelivery } from "@/data/programmeDelivery";

const pct = (value) => `${(value * 100).toFixed(0)}%`;
function Stat({ label, value, foot, bad }) {
  return <div className="rounded-lg bg-canvas/70 p-3"><p className="text-[10.5px] text-sub">{label}</p><p className={`mt-1 text-[18px] font-semibold tabular-nums ${bad ? "text-[#B54708]" : "text-ink"}`}>{value}</p><p className="mt-0.5 text-[10.5px] text-sub">{foot}</p></div>;
}

// The programme side of this district, so the analyst reads poverty and delivery together.
export default function DistrictDelivery({ district, requests, onOpenRequests }) {
  const d = districtDelivery(district, requests);
  return <section className="rounded-xl border border-hairline bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink"><Truck className="h-4 w-4 text-brand" />Programme delivery in {district}</h3><span className="rounded-full border border-[#FEDF89] bg-[#FFFAEB] px-2 py-0.5 text-[10px] font-medium text-[#B54708]">Sample data</span></div>
    {!d.hasRecords ? <p className="mt-3 rounded-lg border border-dashed border-hairline bg-canvas/50 px-4 py-5 text-center text-[12px] text-sub">No programme records exist for {district} in the sample registry. That can mean no programme presence or simply that the sample does not include it. Ask a programme team to confirm.</p>
      : <>
        <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Stat label="Program Members on record" value={d.enrolled} foot={`${d.active} active · ${d.pending} pending · ${d.suspended} suspended`} />
          <Stat label="October payment problems" value={pct(d.payments.problemRate)} foot={`${d.payments.failed} failed · ${d.payments.pending} pending of ${d.payments.total}`} bad={d.payments.problemRate >= 0.1} />
          <Stat label="Pending or suspended" value={pct(d.enrolmentIssueShare)} foot="of enrolled program members" bad={d.enrolmentIssueShare >= 0.18} />
          <Stat label="Health-cover lapses" value={pct(d.healthLapseShare)} foot={`${d.agents} field agents in the district`} />
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-sub">{d.payments.problemRate >= 0.1 ? "Payment problems are above the level worth checking. " : ""}{d.requests.open || d.requests.completed ? <>You have {d.requests.open} open and {d.requests.completed} completed requests here. <button type="button" onClick={onOpenRequests} className="font-medium text-brand hover:underline">See them</button>.</> : "You have not asked a programme team about this district yet."}</p>
      </>}
    <p className="mt-3 border-t border-hairline pt-2 text-[10.5px] leading-relaxed text-[#8A94A6]">{DELIVERY_NOTE} Records describe delivery and do not show whether programmes reduce poverty.</p>
  </section>;
}
