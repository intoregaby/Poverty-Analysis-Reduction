import React from "react";
import { useLocation } from "react-router-dom";
import InfoTip from "@/components/analyst/support/InfoTip";
import { useTranslation } from "react-i18next";
import { hasTour, introKey } from "@/components/tour/tours";

export default function PageHeader({ title, badge = null, actions = null }) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const help = hasTour(pathname) ? t(introKey(pathname)) : null;
  return (
    <div className="sticky top-0 z-30 border-b border-hairline bg-white/85 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <h1 data-tour="page-title" className="text-[15px] font-semibold tracking-tight text-ink">{title}</h1>
        {help && <InfoTip label={title} large>{help}</InfoTip>}
        {badge}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}
