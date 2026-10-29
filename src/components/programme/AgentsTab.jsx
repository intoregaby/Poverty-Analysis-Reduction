import React, { useState } from "react";
import { Search, Plus, Star, Phone, Users } from "lucide-react";
import { useProgrammeScope } from "@/lib/programmeScope";
import Agent360 from "@/components/programme/Agent360";

export default function AgentsTab() {
  const { agents: AGENTS } = useProgrammeScope();
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("All");
  const [adding, setAdding] = useState(false);
  const [visible, setVisible] = useState(12);
  const [opened, setOpened] = useState(null);

  const districts = ["All", ...Array.from(new Set(AGENTS.map((a) => a.district)))];
  const filtered = AGENTS.filter(
    (a) =>
      (district === "All" || a.district === district) &&
      (a.name.toLowerCase().includes(q.toLowerCase()) || a.id.toLowerCase().includes(q.toLowerCase()))
  );
  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A94A6]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search agent by name or ID…"
            className="w-full rounded-md border border-hairline py-2 pl-9 pr-3 text-[12.5px] text-ink outline-none focus:border-brand"
          />
        </div>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="rounded-md border border-hairline bg-white px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand"
        >
          {districts.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-[12px] font-medium text-white hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" /> Add agent
        </button>
      </div>

      <p className="text-[11.5px] text-sub">
        Showing {Math.min(visible, filtered.length)} of {filtered.length} agents
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((a) => (
          <div key={a.id} className="rounded-xl border border-hairline bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand">
                  {a.name.split(" ").map((p) => p[0]).join("")}
                </span>
                <div>
                  <button type="button" onClick={() => setOpened(a)} data-tour="agent-open" className="text-left text-[13px] font-medium text-brand hover:underline">{a.name}</button>
                  <p className="text-[10.5px] text-sub">{a.id} · {a.district}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#ABEFC6] bg-[#ECFDF3] px-2 py-[2px] text-[10px] font-medium text-[#067647]">
                <Star className="h-3 w-3 fill-current" /> {a.rating}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
              <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                <p className="text-[10px] text-[#8A94A6]">Program Members</p>
                <p className="font-medium text-ink">{a.beneficiaries}</p>
              </div>
              <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                <p className="text-[10px] text-[#8A94A6]">Visits today</p>
                <p className="font-medium text-ink">{a.visits}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.skillsTaught.map((s) => (
                <span key={s} className="rounded-full border border-hairline px-2 py-[2px] text-[10px] text-sub">{s}</span>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5 text-[11px] text-sub">
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {a.phone}</span>
              <span className={`inline-flex items-center gap-1 ${a.status === "Active" ? "text-[#067647]" : "text-[#B54708]"}`}>
                <Users className="h-3 w-3" /> {a.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {visible < filtered.length && (
        <div className="flex justify-center pt-1">
          <button
            onClick={() => setVisible((v) => v + 12)}
            className="rounded-md border border-hairline bg-white px-4 py-2 text-[12px] font-medium text-ink hover:bg-canvas"
          >
            Load more agents ({filtered.length - visible} remaining)
          </button>
        </div>
      )}

      {opened && <Agent360 agent={opened} onClose={() => setOpened(null)} />}

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setAdding(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-ink">Add new agent</h3>
            <p className="mt-0.5 text-[11.5px] text-sub">Register a field agent and assign wards</p>
            <div className="mt-4 space-y-3">
              <input placeholder="Full name" className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand" />
              <input placeholder="Phone number" className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand" />
              <select className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] outline-none focus:border-brand">
                <option>Select district…</option>
                {districts.filter((d) => d !== "All").map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAdding(false)} className="rounded-md border border-hairline px-3 py-1.5 text-[12px] text-sub hover:bg-canvas">Cancel</button>
              <button onClick={() => setAdding(false)} className="rounded-md bg-brand px-3 py-1.5 text-[12px] font-medium text-white hover:bg-brand/90">Create agent</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}