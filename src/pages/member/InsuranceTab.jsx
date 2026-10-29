import React from "react";
import { useTranslation } from "react-i18next";
import { HeartPulse } from "lucide-react";
import Card from "@/components/analyst/Card";
import { useMyInsurance } from "@/lib/memberApi";
import { amountForHousehold, insuranceSummary } from "@/lib/memberRules";
import { formatDate, formatMoney } from "@/lib/format";

const TONE = { paid: "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]", partial: "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]", unpaid: "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]" };

export default function InsuranceTab({ member }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage;
  const { data, isLoading } = useMyInsurance(member.id);
  if (isLoading || !data) return <p className="py-8 text-center text-[12.5px] text-sub">{t("common.loading")}</p>;
  const summary = insuranceSummary(data.status[0]);
  const expected = amountForHousehold(member.category, member.household_size, data.rates);
  const rate = data.rates.find((item) => item.category === member.category);
  const stat = (label, value) => <div><dt className="text-[11px] text-sub">{label}</dt><dd className="mt-1 text-[18px] font-semibold text-ink">{value}</dd></div>;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card title={t("member.insurance.title")} subtitle={rate?.label} className="xl:col-span-2" tour="member-insurance">
        {!summary ? <p className="text-[12.5px] text-sub">{t("member.insurance.none")}</p> : (
          <>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold ${TONE[summary.status]}`}><HeartPulse className="h-4 w-4" aria-hidden="true" />{t(`member.insurance.status.${summary.status}`)}</span>
            {summary.overdue && <p className="mt-2 text-[12px] text-[#B42318]">{t("member.insurance.overdue")}</p>}
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stat(t("member.insurance.due"), formatMoney(summary.due, language))}
              {stat(t("member.insurance.paid"), formatMoney(summary.paid, language))}
              {stat(t("member.insurance.balance"), formatMoney(summary.balance, language))}
              {stat(t("member.insurance.dueDate"), formatDate(summary.periodEnd, language))}
            </dl>
            <p className="mt-4 text-[12px] text-sub">{t("member.insurance.period", { start: formatDate(summary.periodStart, language), end: formatDate(summary.periodEnd, language) })}</p>
          </>
        )}
      </Card>
      <Card title={t("member.insurance.how")} subtitle={t("member.insurance.howHelp")}>
        <p className="text-[12.5px] text-ink">{t("member.insurance.calc", { category: t(`member.insurance.categories.${member.category}`), count: member.household_size, rate: formatMoney(rate?.annual_per_person ?? 0, language), total: expected == null ? "—" : formatMoney(expected, language) })}</p>
        {rate?.note && <p className="mt-2 text-[11px] text-sub">{rate.note}</p>}
      </Card>
    </div>
  );
}
