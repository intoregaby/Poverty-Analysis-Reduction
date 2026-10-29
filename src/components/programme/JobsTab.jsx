import React, { useState } from "react";
import { Plus, Briefcase, Calendar, Users } from "lucide-react";
import { jobStatusStyle } from "@/data/programme";
import { useProgrammeScope } from "@/lib/programmeScope";

export default function JobsTab() {
  const { jobs: JOBS } = useProgrammeScope();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] text-sub">{JOBS.length} positions · {JOBS.filter((j) => j.status === "Open").length} open · {JOBS.filter((j) => j.status === "In exam" || j.status === "In interview").length} in process</p>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-[12px] font-medium text-white hover:bg-brand/90">
          <Plus className="h-4 w-4" /> Post a job
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {JOBS.map((j) => (
          <div key={j.id} className="rounded-xl border border-hairline bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">
                    <Briefcase className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{j.title}</p>
                    <p className="text-[10.5px] text-sub">{j.programme} · {j.type}</p>
                  </div>
                </div>
              </div>
              <span className={`inline-flex rounded-full border px-2 py-[2px] text-[10px] font-medium ${jobStatusStyle(j.status)}`}>{j.status}</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
              <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                <p className="text-[10px] text-[#8A94A6]">Budget</p>
                <p className="font-medium text-ink">RWF {j.budget.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                <p className="text-[10px] text-[#8A94A6]">Applicants</p>
                <p className="font-medium text-ink">{j.applicants}</p>
              </div>
              <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                <p className="text-[10px] text-[#8A94A6]">Deadline</p>
                <p className="font-medium text-ink">{j.deadline}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {j.skills.map((s) => (
                <span key={s} className="rounded-full border border-hairline px-2 py-[2px] text-[10px] text-sub">{s}</span>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-hairline pt-2.5">
              <div className="rounded-lg border border-hairline px-3 py-2">
                <p className="flex items-center gap-1 text-[10px] font-medium text-[#8A94A6]"><Calendar className="h-3 w-3" /> Exam</p>
                <p className="mt-0.5 text-[11.5px] font-medium text-ink">{j.exam.date}</p>
                <p className="text-[10.5px] text-sub">{j.exam.time} · {j.exam.venue}</p>
              </div>
              <div className="rounded-lg border border-hairline px-3 py-2">
                <p className="flex items-center gap-1 text-[10px] font-medium text-[#8A94A6]"><Users className="h-3 w-3" /> Interview</p>
                <p className="mt-0.5 text-[11.5px] font-medium text-ink">{j.interview.date}</p>
                <p className="text-[10.5px] text-sub">{j.interview.time} · {j.interview.venue}</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button className="flex-1 rounded-md border border-hairline px-3 py-1.5 text-[11.5px] font-medium text-ink hover:bg-canvas">View applicants</button>
              <button className="flex-1 rounded-md bg-brand px-3 py-1.5 text-[11.5px] font-medium text-white hover:bg-brand/90">Shortlist</button>
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setCreating(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-ink">Post a new job</h3>
            <p className="mt-0.5 text-[11.5px] text-sub">Create a position, schedule the exam and interview</p>
            <div className="mt-4 space-y-3">
              <input placeholder="Job title" className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Budget (RWF)" type="number" className="rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand" />
                <select className="rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand">
                  <option>Full-time</option><option>Contract</option><option>Part-time</option>
                </select>
              </div>
              <input placeholder="Required skills (comma separated)" className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-[11px] font-medium text-sub">Exam date</p>
                  <input type="date" className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand" />
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-medium text-sub">Exam time</p>
                  <input type="time" className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand" />
                </div>
              </div>
              <input placeholder="Exam venue" className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-[11px] font-medium text-sub">Interview date</p>
                  <input type="date" className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand" />
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-medium text-sub">Interview time</p>
                  <input type="time" className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand" />
                </div>
              </div>
              <input placeholder="Interview venue" className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setCreating(false)} className="rounded-md border border-hairline px-3 py-1.5 text-[12px] text-sub hover:bg-canvas">Cancel</button>
              <button onClick={() => setCreating(false)} className="rounded-md bg-brand px-3 py-1.5 text-[12px] font-medium text-white hover:bg-brand/90">Publish job</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}