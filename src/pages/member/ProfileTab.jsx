import React from "react";
import { useTranslation } from "react-i18next";
import { Users, ShieldCheck, HeartHandshake } from "lucide-react";
import Card from "@/components/analyst/Card";

export default function ProfileTab({ member }) {
  const { t } = useTranslation();
  const services = member.member_services.filter((item) => item.kind === "service");
  const protection = member.member_services.filter((item) => item.kind === "protection");
  const fact = (label, value) => <div><dt className="text-[11px] text-sub">{label}</dt><dd className="text-[13px] font-medium text-ink">{value || "—"}</dd></div>;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card title={t("member.profile.title")} subtitle={member.code} className="xl:col-span-2" tour="member-profile">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {fact(t("member.profile.name"), member.full_name)}
          {fact(t("member.profile.phone"), member.phone)}
          {fact(t("member.profile.area"), [member.district, member.sector, member.cell].filter(Boolean).join(" · "))}
          {fact(t("member.profile.household"), t("member.profile.householdOf", { count: member.household_size }))}
          {fact(t("member.profile.category"), t(`member.insurance.categories.${member.category}`))}
          {fact(t("member.profile.programme"), member.programme)}
        </dl>
      </Card>
      <Card title={t("member.profile.services")} subtitle={t("member.profile.servicesHelp")}>
        <ul className="space-y-2">
          {services.map((item) => <li key={item.id} className="flex items-start gap-2 text-[12.5px]"><HeartHandshake className="mt-0.5 h-4 w-4 text-brand" aria-hidden="true" /><span><span className="font-medium text-ink">{item.title}</span><span className="block text-[11px] text-sub">{item.detail}</span></span></li>)}
          {protection.map((item) => <li key={item.id} className="flex items-start gap-2 text-[12.5px]"><ShieldCheck className="mt-0.5 h-4 w-4 text-pos" aria-hidden="true" /><span><span className="font-medium text-ink">{item.title}</span><span className="block text-[11px] text-sub">{item.detail}</span></span></li>)}
        </ul>
      </Card>
      <Card title={t("member.profile.family")} subtitle={t("member.profile.familyHelp")} className="xl:col-span-3">
        {member.family_members.length === 0 ? <p className="text-[12px] text-sub">{t("member.profile.noFamily")}</p> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {member.family_members.map((person) => (
              <li key={person.id} className="rounded-lg border border-hairline p-3">
                <p className="flex items-center gap-2 text-[13px] font-medium text-ink"><Users className="h-4 w-4 text-sub" aria-hidden="true" />{person.full_name}</p>
                <p className="text-[11px] text-sub">{person.relation}{person.age != null && ` · ${t("member.profile.age", { count: person.age })}`}</p>
                {person.services.length > 0 && <p className="mt-2 text-[11.5px] text-ink"><span className="text-sub">{t("member.profile.services")}: </span>{person.services.join(", ")}</p>}
                {person.protection.length > 0 && <p className="text-[11.5px] text-ink"><span className="text-sub">{t("member.profile.protection")}: </span>{person.protection.join(", ")}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
