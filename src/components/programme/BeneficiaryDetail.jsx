import React from "react";
import { X, HeartPulse, Award, Users, ClipboardList, MapPin } from "lucide-react";
import { healthStatusStyle, taskStatusStyle } from "@/data/programme";
import { useCooperatives } from "@/lib/cooperatives";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-[#8A94A6]">{label}</span>
      <span className="text-[12px] font-medium text-ink">{value}</span>
    </div>
  );
}

export default function BeneficiaryDetail({ beneficiary: b, onClose }) {
  const coop = useCooperatives().coopOf(b.id);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-hairline bg-white px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand">
              {b.name.split(" ").map((p) => p[0]).join("")}
            </span>
            <div>
              <p className="text-[14px] font-semibold text-ink">{b.name}</p>
              <p className="text-[11px] text-sub">{b.id} · {b.district}, {b.sector}</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-sub hover:bg-canvas">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-canvas px-2 py-2">
              <p className="text-[10px] text-[#8A94A6]">Age</p>
              <p className="text-[14px] font-semibold text-ink">{b.age}</p>
            </div>
            <div className="rounded-lg bg-canvas px-2 py-2">
              <p className="text-[10px] text-[#8A94A6]">Family</p>
              <p className="text-[14px] font-semibold text-ink">{b.familySize}</p>
            </div>
            <div className="rounded-lg bg-canvas px-2 py-2">
              <p className="text-[10px] text-[#8A94A6]">Payment</p>
              <p className="text-[14px] font-semibold text-ink">{b.monthlyPayment > 0 ? `RWF ${b.monthlyPayment.toLocaleString()}` : "—"}</p>
            </div>
          </div>

          {/* Health insurance */}
          <section className="rounded-xl border border-hairline p-4">
            <div className="mb-2 flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-brand" />
              <h3 className="text-[12.5px] font-semibold text-ink">Health insurance</h3>
              <span className={`ml-auto inline-flex rounded-full border px-2 py-[2px] text-[10px] font-medium ${healthStatusStyle(b.health.status)}`}>{b.health.status}</span>
            </div>
            <Row label="Scheme" value={b.health.scheme} />
            <Row label="Card no." value={b.health.cardNo} />
            <Row label="Expires" value={b.health.expires} />
            {b.health.status !== "Paid" && (
              <button className="mt-2 w-full rounded-md bg-brand px-3 py-1.5 text-[11.5px] font-medium text-white hover:bg-brand/90">
                Renew insurance
              </button>
            )}
          </section>

          {/* Tasks */}
          <section className="rounded-xl border border-hairline p-4">
            <div className="mb-2 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-brand" />
              <h3 className="text-[12.5px] font-semibold text-ink">Tasks</h3>
            </div>
            <ul className="space-y-2">
              {b.tasks.map((t, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2">
                  <div>
                    <p className="text-[12px] font-medium text-ink">{t.title}</p>
                    <p className="text-[10.5px] text-sub">Due {t.due} · {t.agent}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-[2px] text-[10px] font-medium ${taskStatusStyle(t.status)}`}>{t.status}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Skills */}
          <section className="rounded-xl border border-hairline p-4">
            <div className="mb-2 flex items-center gap-2">
              <Award className="h-4 w-4 text-brand" />
              <h3 className="text-[12.5px] font-semibold text-ink">Skills & training</h3>
            </div>
            <ul className="space-y-2.5">
              {b.skills.map((s, i) => (
                <li key={i}>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="font-medium text-ink">{s.name}</span>
                    <span className="text-sub">{s.level}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${s.progress}%` }} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#8A94A6]">Taught by {s.agent}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Family skills */}
          <section className="rounded-xl border border-hairline p-4">
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-brand" />
              <h3 className="text-[12.5px] font-semibold text-ink">Family skills & knowledge</h3>
            </div>
            {b.family.length === 0 ? (
              <p className="text-[11px] text-[#8A94A6]">No family members recorded.</p>
            ) : (
              <ul className="space-y-2">
                {b.family.map((f, i) => (
                  <li key={i} className="rounded-lg bg-canvas px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-ink">{f.name}</span>
                      <span className="text-[10.5px] text-sub">{f.relation} · {f.age}y</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {f.skills.length === 0 ? (
                        <span className="text-[10px] text-[#8A94A6]">No skills recorded</span>
                      ) : (
                        f.skills.map((s) => (
                          <span key={s} className="rounded-full border border-hairline px-2 py-[1px] text-[10px] text-sub">{s}</span>
                        ))
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button className="mt-2 w-full rounded-md border border-hairline px-3 py-1.5 text-[11.5px] font-medium text-ink hover:bg-canvas">
              Match family to jobs
            </button>
          </section>

          {/* Awards */}
          {b.awards.length > 0 && (
            <section className="rounded-xl border border-hairline p-4">
              <div className="mb-2 flex items-center gap-2">
                <Award className="h-4 w-4 text-[#067647]" />
                <h3 className="text-[12.5px] font-semibold text-ink">Awards</h3>
              </div>
              <ul className="space-y-2">
                {b.awards.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-lg border border-[#ABEFC6] bg-[#ECFDF3] px-3 py-2">
                    <Award className="h-4 w-4 text-[#067647]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-ink">{a.type}</p>
                      <p className="text-[10.5px] text-sub">{a.skill} · {a.date}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Cooperative */}
          <section className="rounded-xl border border-hairline p-4">
            <div className="mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand" />
              <h3 className="text-[12.5px] font-semibold text-ink">Cooperative</h3>
            </div>
            {coop ? (
              <div>
                <p className="text-[12px] font-medium text-ink">{coop.name}</p>
                <p className="mt-0.5 text-[11px] text-[#8A94A6]">{coop.activity} · {coop.sector}, {coop.district} · {coop.health}</p>
              </div>
            ) : (
              <p className="text-[11px] text-[#8A94A6]">Not in a cooperative. The program member can ask to join from My Benefits, and the sector leader decides.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}