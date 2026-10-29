import React from "react";
import { Briefcase, MapPin, Clock } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/analyst/Card";
import PanelGuide from "@/components/analyst/PanelGuide";

const POSITIONS = [
  { title: "Field Agent", programme: "VUP Direct Support", location: "Nyaruguru", type: "Full-time", deadline: "10 Nov 2024" },
  { title: "Data Entry Officer", programme: "Girinka Munyarwanda", location: "Nyanza", type: "Contract", deadline: "8 Nov 2024" },
  { title: "Programme Officer", programme: "Expanded Public Works", location: "Nyamagabe", type: "Full-time", deadline: "15 Nov 2024" },
];

export default function JobApplicant() {
  return (
    <div className="pb-14">
      <PageHeader
        title="Find a Job"
        badge={
          <span className="hidden items-center gap-1.5 rounded-full border border-hairline px-2 py-[3px] text-[11px] text-sub sm:inline-flex">
            Open positions
          </span>
        }
      />

      <PanelGuide id="job-applicant" title="Find a Job">
        This page shows open positions across social-support programmes. Apply to roles that match
        your skills. Check your application status at the top.
      </PanelGuide>

      <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4">
          <h2 className="text-[20px] font-semibold tracking-tight text-ink">Open Positions</h2>
          <p className="mt-0.5 text-[12px] text-sub">Apply to social-support programmes across Rwanda</p>
        </div>

        <Card tour="job-application" title="Your application" subtitle="Current status">
          <div className="flex items-center justify-between rounded-lg border border-hairline px-4 py-3">
            <div>
              <p className="text-[12.5px] font-medium text-ink">Field Agent · VUP Direct Support</p>
              <p className="text-[11px] text-sub">Submitted 21 Oct 2024</p>
            </div>
            <span className="inline-flex rounded-full border border-[#FEDF89] bg-[#FFFAEB] px-2 py-[2px] text-[10.5px] font-medium text-[#B54708]">
              Under review
            </span>
          </div>
        </Card>

        <Card tour="job-open" title="Open positions" subtitle="3 roles" className="mt-4" bodyClassName="px-0 pb-0">
          <ul className="border-t border-hairline">
            {POSITIONS.map((p) => (
              <li key={p.title + p.programme} className="border-b border-hairline/70 px-5 py-3.5 last:border-0 hover:bg-[#FAFBFD]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{p.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-sub">{p.programme}</p>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-[10.5px] text-[#8A94A6]">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.location}</span>
                      <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {p.type}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {p.deadline}</span>
                    </div>
                  </div>
                  <button className="rounded-md border border-hairline px-3 py-1.5 text-[11.5px] font-medium text-ink hover:bg-canvas">
                    Apply
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <p className="mt-5 text-[10.5px] text-[#8A94A6]">
          Job applicants get a limited account: applications and status only.
        </p>
      </div>
    </div>
  );
}