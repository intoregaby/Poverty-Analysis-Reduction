import React from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/layout/PageHeader";
import BeneficiaryAccess from "@/pages/BeneficiaryAccess";
import MemberGate from "@/pages/member/MemberGate";
import ProfileTab from "@/pages/member/ProfileTab";
import CooperativesTab from "@/pages/member/CooperativesTab";
import SpaceTab from "@/pages/member/SpaceTab";
import AgentTab from "@/pages/member/AgentTab";
import InsuranceTab from "@/pages/member/InsuranceTab";
import { MEMBER_TABS } from "@/lib/memberTabs";

const TABS = { profile: ProfileTab, cooperatives: CooperativesTab, space: SpaceTab, agent: AgentTab, insurance: InsuranceTab };

// The Program Member panel. Its sections are listed in the sidebar, the same way the Government and Programme panels do it.
export default function MemberPanel() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const tab = MEMBER_TABS.some((item) => item.id === params.get("tab")) ? params.get("tab") : "overview";
  const Tab = TABS[tab];
  return (
    <div className="pb-14">
      <PageHeader title={t("member.panel")} />
      {tab === "overview" ? <BeneficiaryAccess embedded /> : (
        <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-[20px] font-semibold tracking-tight text-ink">{t(`member.tabs.${tab}`)}</h2>
          <MemberGate>{(member) => <Tab member={member} />}</MemberGate>
        </div>
      )}
    </div>
  );
}
