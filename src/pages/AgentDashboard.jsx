import React, { useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, Users, ClipboardList } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/analyst/Card";
import PanelGuide from "@/components/analyst/PanelGuide";

const VISITS = [
  { name: "Mukasine Beatrice", cell: "Rusenge", type: "Payment verification", time: "09:30", status: "Done" },
  { name: "Habimana Jean", cell: "Kibingo", type: "Enrolment", time: "11:00", status: "Done" },
  { name: "Uwase Diane", cell: "Mata", type: "Complaint follow-up", time: "13:30", status: "In progress" },
  { name: "Nshuti Patrick", cell: "Kivu", type: "Payment verification", time: "15:00", status: "Pending" },
  { name: "Mukamana Claire", cell: "Gitanga", type: "Home visit", time: "16:30", status: "Pending" },
];

const PROBLEMS = [
  { name: "Mukamana Claire", issue: "Did not receive October payment", priority: "High" },
  { name: "Habimana Jean", issue: "Program Member moved to another district", priority: "Medium" },
];

function Kpi({ icon: Icon, label, value, foot }) {
  return (
    <div className="rounded-xl border border-hairline bg-white px-4 py-3.5">
      <div className="flex items-center gap-2 text-sub">
        <Icon className="h-4 w-4" strokeWidth={1.9} />
        <span className="text-[11.5px] font-medium">{label}</span>
      </div>
      <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-1.5 text-[11px] text-[#8A94A6]">{foot}</p>
    </div>
  );
}

export default function AgentDashboard() {
  const [recorded, setRecorded] = useState(false);

  return (
    <div className="pb-14">
      <PageHeader
        title="Agent Dashboard"
        badge={
          <span className="hidden items-center gap-1.5 rounded-full border border-hairline px-2 py-[3px] text-[11px] text-sub sm:inline-flex">
            VUP · Nyaruguru
          </span>
        }
      />

      <PanelGuide id="agent-dashboard" title="Field Work">
        This page shows your daily field work — visits, problems and tasks. Use it to plan your day
        and record visits after you complete them.
      </PanelGuide>

      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4" data-tour="agent-day">
          <h2 className="text-[20px] font-semibold tracking-tight text-ink">Today's field work</h2>
          <p className="mt-0.5 text-[12px] text-sub">Assigned program members, visits and problem reports</p>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi icon={Users} label="Assigned" value="47" foot="within VUP programme" />
          <Kpi icon={CheckCircle2} label="Visits today" value="8" foot="3 completed" />
          <Kpi icon={Clock} label="Pending" value="3" foot="scheduled this afternoon" />
          <Kpi icon={AlertTriangle} label="Problems" value="2" foot="flagged for supervisor" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card tour="agent-visits" title="Today's visits" subtitle="Schedule" className="xl:col-span-2" bodyClassName="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-y border-hairline bg-[#FAFBFD] text-[10.5px] uppercase tracking-[0.06em] text-[#8A94A6]">
                    <th className="py-2 pl-5 pr-3 text-left font-medium">Program Member</th>
                    <th className="px-3 py-2 text-left font-medium">Cell</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-right font-medium">Time</th>
                    <th className="py-2 pl-3 pr-5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {VISITS.map((v) => (
                    <tr key={v.name + v.time} className="border-b border-hairline/70 last:border-0 hover:bg-[#FAFBFD]">
                      <td className="py-2.5 pl-5 pr-3 font-medium text-ink">{v.name}</td>
                      <td className="px-3 py-2.5 text-sub">{v.cell}</td>
                      <td className="px-3 py-2.5 text-sub">{v.type}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-sub">{v.time}</td>
                      <td className="py-2.5 pl-3 pr-5 text-right">
                        <span className={`inline-flex rounded-full border px-2 py-[2px] text-[10.5px] font-medium ${
                          v.status === "Done" ? "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]" :
                          v.status === "In progress" ? "border-[#D3CEFF] bg-[#EFEDFF] text-[#4B3FCC]" :
                          "border-hairline bg-[#FAFBFD] text-[#8A94A6]"
                        }`}>{v.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card tour="agent-record" title="Record a visit" subtitle="Quick capture">
              <button
                onClick={() => setRecorded(true)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-[12px] font-medium text-white hover:bg-brand/90"
              >
                <ClipboardList className="h-4 w-4" /> Record visit
              </button>
              {recorded && (
                <p className="mt-2 rounded-md border border-[#ABEFC6] bg-[#ECFDF3] px-3 py-2 text-[11px] text-[#067647]">
                  Visit recorded. The supervisor will see it in real time.
                </p>
              )}
            </Card>

            <Card tour="agent-problems" title="Problem reports" subtitle="Escalated" bodyClassName="px-0 pb-0">
              <ul className="border-t border-hairline">
                {PROBLEMS.map((p) => (
                  <li key={p.name} className="border-b border-hairline/70 px-5 py-2.5 last:border-0">
                    <p className="text-[12px] font-medium text-ink">{p.name}</p>
                    <p className="text-[10.5px] text-sub">{p.issue}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}