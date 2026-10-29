import React from "react";
import { useTranslation } from "react-i18next";
import { History, Phone, UserRound } from "lucide-react";
import SidePanel from "@/components/investigation/SidePanel";
import { useAgent360 } from "@/lib/govApi";
import { formatDateTime } from "@/lib/format";

const TONE = { Accepted: "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]", Rejected: "border-[#FEE4E2] bg-[#FEF3F2] text-[#B42318]", Submitted: "border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3]", "Under review": "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]" };
const Row = ({ label, value }) => <div className="flex justify-between gap-3 border-b border-hairline/70 py-1.5 text-[12px] last:border-0"><span className="text-sub">{label}</span><span className="text-right font-medium text-ink">{value || "—"}</span></div>;

// The 360 view of a field agent. `agent` is the row from the applications/agents list; the database record is found by its code.
export default function Agent360({ agent, onClose }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage;
  const { data, isLoading, error } = useAgent360(agent.id);
  const application = data?.application;
  const done = data?.visits.filter((visit) => visit.status === "Done").length ?? 0;
  return (
    <SidePanel wide title={agent.name} subtitle={`${agent.id} · ${agent.district}`} icon={UserRound} onClose={onClose}>
      <div className="space-y-5 p-4" data-tour="agent-360">
        <section>
          <h3 className="text-[10.5px] font-semibold uppercase tracking-wide text-sub">{t("agent360.joined")}</h3>
          {isLoading ? <p className="mt-2 text-[12px] text-sub">{t("common.loading")}</p> : error ? <p role="alert" className="mt-2 text-[12px] text-[#B54708]">{error.message}</p> : !application ? <p className="mt-2 text-[12px] text-sub">{t("agent360.noApplication")}</p> : (
            <div className="mt-2">
              <p className="text-[15px] font-semibold text-ink">{formatDateTime(application.submitted_at, language)}</p>
              <p className="mt-1 text-[11.5px] text-sub">{t("agent360.basedOn")}</p>
              <p className="mt-2"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${TONE[application.status]}`}>{t(`agent360.status.${application.status}`)}</span></p>
            </div>
          )}
        </section>
        {application && (
          <section>
            <h3 className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide text-sub"><History className="h-3.5 w-3.5" aria-hidden="true" />{t("agent360.history")}</h3>
            <ol className="mt-2 space-y-2 border-l border-hairline pl-3">
              {application.history.map((step, index) => <li key={index} className="text-[12px]"><span className="font-medium text-ink">{t(`agent360.status.${step.status}`)}</span><span className="block text-[11px] text-sub">{formatDateTime(step.at, language)}</span></li>)}
            </ol>
          </section>
        )}
        <section>
          <h3 className="text-[10.5px] font-semibold uppercase tracking-wide text-sub">{t("agent360.work")}</h3>
          <div className="mt-2">
            <Row label={t("member.agent.phone")} value={agent.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" aria-hidden="true" />{agent.phone}</span> : null} />
            <Row label={t("member.agent.area")} value={data?.agent ? [data.agent.district, ...data.agent.sectors].join(" · ") : agent.district} />
            <Row label={t("agent360.members")} value={data ? data.members : null} />
            <Row label={t("agent360.visitsDone")} value={data ? `${done} / ${data.visits.length}` : null} />
            <Row label={t("agent360.status.label")} value={agent.status} />
          </div>
        </section>
        <p className="border-t border-hairline pt-3 text-[10.5px] text-[#8A94A6]">{t("agent360.note")}</p>
      </div>
    </SidePanel>
  );
}
