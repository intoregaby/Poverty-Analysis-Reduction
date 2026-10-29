import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { HeartPulse, MapPin, Search, UserRound, UsersRound, Users } from "lucide-react";
import SidePanel from "@/components/investigation/SidePanel";
import { useGovMembers, useMember360 } from "@/lib/govApi";
import { insuranceSummary } from "@/lib/memberRules";
import { formatDate, formatMoney } from "@/lib/format";

const TONE = { paid: "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]", partial: "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]", unpaid: "border-[#FEE4E2] bg-[#FEF3F2] text-[#B42318]", none: "border-hairline bg-canvas text-sub" };

export function InsuranceChip({ row }) {
  const { t } = useTranslation();
  const summary = insuranceSummary(row);
  const key = summary?.status || "none";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${TONE[key]}`}>{t(`gov.insurance.${key}`)}</span>;
}

const Row = ({ label, value }) => <div className="flex justify-between gap-3 border-b border-hairline/70 py-1.5 text-[12px] last:border-0"><span className="text-sub">{label}</span><span className="text-right font-medium text-ink">{value || "—"}</span></div>;
const Section = ({ icon: Icon, title, children }) => <section><h3 className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide text-sub"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{title}</h3><div className="mt-2">{children}</div></section>;

// The 360 view of one member, from the database. A leader only reaches it from a list limited to their own area.
export function Member360Db({ id, onClose }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage;
  const { data, isLoading, error } = useMember360(id);
  const member = data?.member;
  const summary = insuranceSummary(member?.insurance_status?.[0]);
  return (
    <SidePanel wide title={member?.full_name || t("common.loading")} subtitle={member ? `${member.code} · ${member.sector}, ${member.district}` : undefined} icon={UserRound} onClose={onClose}>
      {error && <p role="alert" className="p-4 text-[12px] text-[#B54708]">{error.message}</p>}
      {isLoading && <p className="p-4 text-[12px] text-sub">{t("common.loading")}</p>}
      {member && (
        <div className="space-y-5 p-4" data-tour="gov-360">
          <Section icon={HeartPulse} title={t("gov.insurance.title")}>
            <p className="mb-2"><InsuranceChip row={member.insurance_status?.[0]} /></p>
            {summary ? <>
              <Row label={t("member.insurance.due")} value={formatMoney(summary.due, language)} />
              <Row label={t("member.insurance.paid")} value={formatMoney(summary.paid, language)} />
              <Row label={t("member.insurance.balance")} value={formatMoney(summary.balance, language)} />
              <Row label={t("member.insurance.dueDate")} value={formatDate(summary.periodEnd, language)} />
              <Row label={t("member.profile.category")} value={t(`member.insurance.categories.${member.category}`)} />
            </> : <p className="text-[12px] text-sub">{t("member.insurance.none")}</p>}
          </Section>
          <Section icon={MapPin} title={t("gov.who")}>
            <Row label={t("member.profile.household")} value={t("member.profile.householdOf", { count: member.household_size })} />
            <Row label={t("gov.area")} value={[member.cell, member.sector, member.district].filter(Boolean).join(", ")} />
            <Row label={t("member.profile.programme")} value={member.programme} />
            <Row label={t("gov.agent")} value={data.agent ? `${data.agent.agents.full_name} (${t(`member.agent.proximity.${data.agent.proximity}`)})` : t("member.agent.none")} />
          </Section>
          <Section icon={UsersRound} title={t("gov.coops")}>
            {data.coops.length === 0 ? <p className="text-[12px] text-sub">{t("gov.noCoop")}</p> : <ul className="space-y-1 text-[12.5px] text-ink">{data.coops.map((item) => <li key={item.cooperatives.name}>{item.cooperatives.name} <span className="text-sub">· {t(`member.coops.roles.${item.coop_role}`)}</span></li>)}</ul>}
          </Section>
          <Section icon={Users} title={t("gov.family")}>
            {member.family_members.length === 0 ? <p className="text-[12px] text-sub">{t("member.profile.noFamily")}</p> : <ul className="divide-y divide-hairline rounded-lg border border-hairline">{member.family_members.map((person) => <li key={person.id} className="px-3 py-2 text-[12px]"><span className="font-medium text-ink">{person.full_name}</span> <span className="text-sub">· {person.relation}</span></li>)}</ul>}
          </Section>
        </div>
      )}
    </SidePanel>
  );
}

export default function GovMembersDb({ scopeLabel }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage;
  const { data = [], isLoading, error } = useGovMembers();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(null);
  const rows = useMemo(() => data.filter((item) => (!query || item.full_name.toLowerCase().includes(query.toLowerCase())) && (!filter || (insuranceSummary(item.insurance_status?.[0])?.status || "none") === filter)), [data, query, filter]);
  const unpaid = data.filter((item) => insuranceSummary(item.insurance_status?.[0])?.balance > 0).length;
  return (
    <div className="space-y-3" data-tour="gov-members">
      <div><h2 className="text-[20px] font-semibold tracking-tight text-ink">{t("common.programMembers")}</h2><p className="mt-0.5 text-[12px] text-sub">{t("gov.membersHelp", { area: scopeLabel })}</p></div>
      {error && <p role="alert" className="text-[12px] text-[#B54708]">{error.message}</p>}
      <p className="flex items-center gap-2 text-[12px] text-ink"><HeartPulse className="h-4 w-4 text-[#B54708]" aria-hidden="true" />{t("gov.unpaidCount", { count: unpaid })}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-sub" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("gov.search")} aria-label={t("gov.search")} className="w-full rounded-md border border-hairline bg-white py-2 pl-8 pr-3 text-[12.5px] outline-none focus:border-brand" /></label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label={t("gov.insurance.title")} className="rounded-md border border-hairline bg-white px-2.5 py-2 text-[12px] text-ink">
          <option value="">{t("gov.insurance.any")}</option>
          {["paid", "partial", "unpaid"].map((key) => <option key={key} value={key}>{t(`gov.insurance.${key}`)}</option>)}
        </select>
      </div>
      {isLoading ? <p className="py-6 text-center text-[12px] text-sub">{t("common.loading")}</p> : rows.length === 0 ? <p className="rounded-lg border border-dashed border-hairline bg-white px-4 py-8 text-center text-[12.5px] text-sub">{t("gov.noMembers")}</p> : (
        <div className="overflow-x-auto rounded-xl border border-hairline bg-white">
          <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
            <thead><tr className="border-b border-hairline bg-[#FAFBFD] text-[10.5px] uppercase tracking-[0.06em] text-[#8A94A6]"><th className="px-4 py-2 text-left font-medium">{t("member.profile.name")}</th><th className="px-3 py-2 text-left font-medium">{t("gov.sectorCell")}</th><th className="px-3 py-2 text-left font-medium">{t("gov.insurance.title")}</th><th className="px-3 py-2 text-right font-medium">{t("member.insurance.balance")}</th></tr></thead>
            <tbody>{rows.slice(0, 100).map((item) => {
              const summary = insuranceSummary(item.insurance_status?.[0]);
              return <tr key={item.id} className="border-b border-hairline/70 last:border-0 hover:bg-[#FAFBFD]">
                <td className="px-4 py-2.5 font-medium"><button type="button" onClick={() => setOpen(item.id)} className="text-left text-brand hover:underline">{item.full_name}</button></td>
                <td className="px-3 py-2.5 text-sub">{item.sector} · {item.cell}</td>
                <td className="px-3 py-2.5"><InsuranceChip row={item.insurance_status?.[0]} /></td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink">{summary ? formatMoney(summary.balance, language) : "—"}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
      <p className="text-[11.5px] text-sub">{t("gov.count", { count: rows.length })}</p>
      {open && <Member360Db id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
