import React from "react";
import { Award, CheckCircle2, HeartPulse, ListChecks, MapPin, TriangleAlert, UserRound, Users, UsersRound, Wallet } from "lucide-react";
import SidePanel from "@/components/investigation/SidePanel";
import { PAYMENTS } from "@/data/programme";
import { statusStyle } from "@/lib/govArea";

const Section = ({ icon: Icon, title, children }) => <section><h3 className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide text-sub"><Icon className="h-3.5 w-3.5" />{title}</h3><div className="mt-2">{children}</div></section>;
const Row = ({ label, value }) => <div className="flex justify-between gap-3 border-b border-hairline/70 py-1.5 text-[12px] last:border-0"><span className="text-sub">{label}</span><span className="text-right font-medium text-ink">{value}</span></div>;
const TASK_STYLE = { Done: "text-[#067647]", "In progress": "text-[#4B3FCC]", Pending: "text-[#B54708]" };

// Everything the records hold about one beneficiary, in one place. A leader only gets here from a list limited to their own area.
export default function Beneficiary360({ person, coopStore, onClose }) {
  const payments = PAYMENTS.filter((item) => item.beneficiary === person.name);
  const link = coopStore?.members.find((item) => item.beneficiaryId === person.id);
  const coop = (link && coopStore.coops.find((item) => item.id === link.coopId)) || coopStore?.coops.find((item) => item.name === person.cooperative) || null;
  const flags = [
    ["Pending", "Suspended"].includes(person.status) && `Enrolment is ${person.status.toLowerCase()}`,
    person.health?.status === "Unpaid" && "Health cover is unpaid",
    person.health?.status === "Expiring" && `Health cover expires ${person.health.expires}`,
    ...payments.filter((item) => item.status !== "Delivered").map((item) => `Payment ${item.id} ${item.status.toLowerCase()} (${item.date})`),
    !person.cooperative && !coop && "Not in a cooperative",
    person.tasks?.some((item) => item.status === "Pending") && `${person.tasks.filter((item) => item.status === "Pending").length} task(s) not started`,
  ].filter(Boolean);

  return <SidePanel wide title={person.name} subtitle={`${person.id} · ${person.sector} sector, ${person.district}`} icon={UserRound} onClose={onClose} actions={<span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle[person.status] || ""}`}>{person.status}</span>}>
    <div className="space-y-5 p-4">
      <section className={`rounded-xl border p-3.5 ${flags.length ? "border-[#FEDF89] bg-[#FFFAEB]/60" : "border-[#ABEFC6] bg-[#ECFDF3]/60"}`}>
        <h3 className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">{flags.length ? <TriangleAlert className="h-4 w-4 text-[#B54708]" /> : <CheckCircle2 className="h-4 w-4 text-[#067647]" />}{flags.length ? "Needs attention" : "Nothing needs attention"}</h3>
        {flags.length > 0 && <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12px] text-ink">{flags.map((item) => <li key={item}>{item}</li>)}</ul>}
      </section>

      <Section icon={MapPin} title="Who and where"><Row label="Age" value={`${person.age} years`} /><Row label="Household size" value={person.familySize} /><Row label="Location" value={`${person.cell} cell, ${person.sector} sector, ${person.district}`} /><Row label="Field agent" value={person.agent} /></Section>

      <Section icon={Wallet} title="Programme and payments"><Row label="Programme" value={person.programme} /><Row label="Monthly payment" value={person.monthlyPayment ? `RWF ${person.monthlyPayment.toLocaleString()}` : "None (not active)"} />
        {payments.length === 0 ? <p className="mt-1 text-[11.5px] text-sub">No payment rows are held for this person.</p> : <ul className="mt-2 divide-y divide-hairline rounded-lg border border-hairline">{payments.map((item) => <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[12px]"><span className="text-ink">{item.date} · RWF {item.amount.toLocaleString()} · {item.channel}</span><span className={`font-medium ${item.status === "Delivered" ? "text-[#067647]" : "text-[#B42318]"}`}>{item.status}</span></li>)}</ul>}</Section>

      <Section icon={HeartPulse} title="Health cover"><Row label="Scheme" value={person.health?.scheme || "Not recorded"} /><Row label="Status" value={person.health?.status || "Not recorded"} /><Row label="Expires" value={person.health?.expires || "Not recorded"} /></Section>

      <Section icon={UsersRound} title="Cooperative">{coop ? <p className="text-[12.5px] text-ink"><strong>{coop.name}</strong> · {coop.activity} · {coop.sector}, {coop.district}<br /><span className="text-[11.5px] text-sub">{coop.health} · {coop.joinStatus === "Open" ? "accepting members" : coop.joinStatus.toLowerCase()}</span></p> : person.cooperative ? <p className="text-[12.5px] text-ink">{person.cooperative}</p> : <p className="text-[12px] text-sub">Not in a cooperative.</p>}</Section>

      <Section icon={Users} title={`Family (${person.family?.length || 0} listed of ${person.familySize})`}>{person.family?.length ? <ul className="divide-y divide-hairline rounded-lg border border-hairline">{person.family.map((item) => <li key={item.name} className="px-3 py-2 text-[12px]"><span className="font-medium text-ink">{item.name}</span> <span className="text-sub">· {item.relation}, {item.age}</span>{item.skills?.length > 0 && <p className="text-[11px] text-sub">Skills: {item.skills.join(", ")}</p>}</li>)}</ul> : <p className="text-[12px] text-sub">No other family members are listed.</p>}</Section>

      <Section icon={ListChecks} title="Skills and training">{person.skills?.length ? <ul className="space-y-2">{person.skills.map((item) => <li key={item.name}><div className="flex justify-between text-[12px]"><span className="font-medium text-ink">{item.name} <span className="font-normal text-sub">· {item.level}</span></span><span className="tabular-nums text-sub">{item.progress}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#EEF1F6]"><div className="h-full rounded-full bg-brand" style={{ width: `${item.progress}%` }} /></div></li>)}</ul> : <p className="text-[12px] text-sub">No skills recorded.</p>}
        {person.tasks?.length > 0 && <ul className="mt-3 divide-y divide-hairline rounded-lg border border-hairline">{person.tasks.map((item) => <li key={item.title} className="flex items-center justify-between gap-2 px-3 py-2 text-[12px]"><span className="text-ink">{item.title}<span className="text-sub"> · due {item.due}</span></span><span className={`shrink-0 font-medium ${TASK_STYLE[item.status] || "text-sub"}`}>{item.status}</span></li>)}</ul>}</Section>

      {person.awards?.length > 0 && <Section icon={Award} title="Awards">{<ul className="space-y-1.5">{person.awards.map((item) => <li key={item.type} className="text-[12px] text-ink">{item.type} <span className="text-sub">· {item.skill}, {item.date}</span></li>)}</ul>}</Section>}

      <p className="border-t border-hairline pt-3 text-[10.5px] leading-relaxed text-[#8A94A6]">Everything here comes from the records held on this platform. Sensitive details are shown only because this person is in your area.</p>
    </div>
  </SidePanel>;
}
