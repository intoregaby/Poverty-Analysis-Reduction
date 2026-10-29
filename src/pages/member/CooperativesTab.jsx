import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Phone } from "lucide-react";
import Card from "@/components/analyst/Card";
import { useCoopDirectory, useCoopSpace, useMyCooperatives } from "@/lib/memberApi";
import { formatDate } from "@/lib/format";

// Which cooperative is chosen, kept for the visit and shared by the cooperative pages.
export function useChosenCoop(memberId) {
  const { data: list = [] } = useMyCooperatives(memberId);
  const [chosen, setChosen] = useState(() => { try { return sessionStorage.getItem("member-coop") || ""; } catch { return ""; } });
  const current = list.find((item) => item.cooperatives.id === chosen) || list[0] || null;
  useEffect(() => { try { if (current) sessionStorage.setItem("member-coop", current.cooperatives.id); } catch { /* the choice is only a convenience */ } }, [current]);
  return { list, current, setChosen };
}

export function CoopSwitcher({ list, current, onChange }) {
  const { t } = useTranslation();
  if (list.length < 2) return null;
  return (
    <label className="mb-4 flex flex-wrap items-center gap-2 text-[12px] text-sub" data-tour="member-coop-switcher">
      {t("member.coops.switcher")}
      <select value={current.cooperatives.id} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-hairline bg-white px-2.5 py-1.5 text-[12.5px] text-ink">
        {list.map((item) => <option key={item.cooperatives.id} value={item.cooperatives.id}>{item.cooperatives.name} ({t(`member.coops.roles.${item.coop_role}`)})</option>)}
      </select>
    </label>
  );
}

export default function CooperativesTab({ member }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage;
  const { list, current, setChosen } = useChosenCoop(member.id);
  const coop = current?.cooperatives;
  const { data: people = [] } = useCoopDirectory(coop?.id);
  const { data: space } = useCoopSpace(coop?.id, member.id);
  if (!current) return <p className="rounded-lg border border-dashed border-hairline bg-white px-4 py-8 text-center text-[12.5px] text-sub">{t("member.coops.none")}</p>;
  const leaders = people.filter((person) => person.coop_role !== "member");
  const election = space?.elections?.[0];
  return (
    <div>
      <CoopSwitcher list={list} current={current} onChange={setChosen} />
      <p className="mb-4 flex items-start gap-2 rounded-lg border border-hairline bg-white p-3 text-[12px] leading-relaxed text-sub"><Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{t("member.coops.readOnly")}</p>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title={coop.name} subtitle={`${coop.sector}, ${coop.district} · ${coop.activity}`} className="xl:col-span-2" tour="member-coop-360">
          <p className="text-[12.5px] text-ink">{coop.purpose}</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div><dt className="text-[11px] text-sub">{t("member.coops.yourRole")}</dt><dd className="text-[13px] font-medium text-ink">{t(`member.coops.roles.${current.coop_role}`)}</dd></div>
            <div><dt className="text-[11px] text-sub">{t("member.coops.memberCount")}</dt><dd className="text-[13px] font-medium text-ink">{people.length}</dd></div>
            <div><dt className="text-[11px] text-sub">{t("member.coops.founded")}</dt><dd className="text-[13px] font-medium text-ink">{coop.founded}</dd></div>
            {election && <>
              <div><dt className="text-[11px] text-sub">{t("member.coops.votingStarts")}</dt><dd className="text-[13px] font-medium text-ink">{formatDate(election.starts_at, language)}</dd></div>
              <div><dt className="text-[11px] text-sub">{t("member.coops.votingEnds")}</dt><dd className="text-[13px] font-medium text-ink">{formatDate(election.ends_at, language)}</dd></div>
            </>}
          </dl>
        </Card>
        <Card title={t("member.coops.leaders")} subtitle={t("member.coops.leadersHelp")}>
          <ul className="space-y-2.5">
            {leaders.map((person) => (
              <li key={person.member_id} className="text-[12.5px]">
                <p className="font-medium text-ink">{person.full_name}</p>
                <p className="text-[11px] text-sub">{t(`member.coops.roles.${person.coop_role}`)}</p>
                {person.phone && <a href={`tel:${person.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-brand"><Phone className="h-3 w-3" aria-hidden="true" />{person.phone}</a>}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t("member.coops.members", { count: people.length })} className="xl:col-span-3" tour="member-coop-members">
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((person) => <li key={person.member_id} className="flex items-center justify-between border-b border-hairline/60 py-1.5 text-[12.5px]"><span className="text-ink">{person.full_name}</span><span className="text-[11px] text-sub">{person.sector}</span></li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
