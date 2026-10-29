import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, ListChecks, MapPin, Phone, UserRound } from "lucide-react";
import Card from "@/components/analyst/Card";
import { useMyAgent } from "@/lib/memberApi";
import { nextVisit } from "@/lib/memberRules";
import { formatDate, formatDateTime } from "@/lib/format";

const STATUS_TONE = { Scheduled: "border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3]", Done: "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]", Missed: "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]", Cancelled: "border-hairline bg-canvas text-sub" };

export default function AgentTab({ member }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage;
  const { data, isLoading } = useMyAgent(member.id);
  if (isLoading || !data) return <p className="py-8 text-center text-[12.5px] text-sub">{t("common.loading")}</p>;
  const current = data.assignments.find((item) => item.is_current);
  const agent = current?.agents;
  const next = nextVisit(data.visits);
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card title={t("member.agent.title")} subtitle={t("member.agent.help")} tour="member-agent">
        {!agent ? <p className="text-[12.5px] text-sub">{t("member.agent.none")}</p> : (
          <div>
            <div className="flex items-center gap-3">
              {agent.photo_url ? <img src={agent.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-full bg-[#EFF2F7] text-ink" aria-hidden="true"><UserRound className="h-6 w-6" /></span>}
              <div><p className="text-[15px] font-semibold text-ink">{agent.full_name}</p><p className="text-[11px] text-sub">{t(`member.agent.proximity.${current.proximity}`)}</p></div>
            </div>
            <dl className="mt-4 space-y-2.5 text-[12.5px]">
              <div><dt className="flex items-center gap-1.5 text-[11px] text-sub"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{t("member.agent.phone")}</dt><dd>{agent.phone ? <a href={`tel:${agent.phone}`} className="font-medium text-brand">{agent.phone}</a> : "—"}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-[11px] text-sub"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{t("member.agent.area")}</dt><dd className="font-medium text-ink">{[agent.district, ...agent.sectors].join(" · ")}</dd></div>
            </dl>
          </div>
        )}
      </Card>

      <Card title={t("member.agent.visits")} subtitle={next ? t("member.agent.nextVisit", { when: formatDateTime(next.scheduled_at, language) }) : undefined} className="xl:col-span-2" tour="member-visits">
        {data.visits.length === 0 ? <p className="text-[12.5px] text-sub">{t("member.agent.noVisits")}</p> : (
          <ul className="space-y-3">
            {data.visits.map((visit) => (
              <li key={visit.id} className="rounded-lg border border-hairline p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-ink"><CalendarClock className="h-4 w-4 text-brand" aria-hidden="true" />{formatDateTime(visit.scheduled_at, language)}</p>
                  <span className={`rounded-full border px-2 py-[2px] text-[10.5px] font-medium ${STATUS_TONE[visit.status]}`}>{t(`member.agent.status.${visit.status}`)}</span>
                </div>
                <p className="mt-1 text-[12.5px] text-ink"><span className="text-sub">{t("member.agent.purpose")}: </span>{visit.purpose}</p>
                {visit.status === "Scheduled" && visit.checklist.length > 0 && (
                  <div className="mt-2 rounded-md bg-canvas/70 p-2.5">
                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-sub"><ListChecks className="h-3.5 w-3.5" aria-hidden="true" />{t("member.agent.prepare")}</p>
                    <ul className="list-inside list-disc space-y-0.5 text-[12px] text-ink">{visit.checklist.map((line) => <li key={line}>{line}</li>)}</ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data.assignments.length > 1 && (
        <Card title={t("member.agent.history")} className="xl:col-span-3">
          <ul className="divide-y divide-hairline/70">
            {data.assignments.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[12.5px]">
                <span className="font-medium text-ink">{item.agents.full_name}</span>
                <span className="text-sub">{t(`member.agent.reason.${item.reason}`, { defaultValue: item.reason })}</span>
                <span className="text-[11.5px] text-sub">{formatDate(item.assigned_at, language)}{item.ended_at ? ` → ${formatDate(item.ended_at, language)}` : ""}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
