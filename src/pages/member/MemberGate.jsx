import React from "react";
import { useTranslation } from "react-i18next";
import { useMe } from "@/lib/memberApi";

// Shared loading, signed-out and "no member record" states for every Program Member page.
export default function MemberGate({ children }) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useMe();
  const box = (text, tone = "text-sub") => <p role="status" className={`rounded-lg border border-hairline bg-white px-4 py-8 text-center text-[12.5px] ${tone}`}>{text}</p>;
  if (isLoading) return box(t("common.loading"));
  if (error) return box(error.message, "text-[#B54708]");
  if (!data) return box(t("member.noSession"));
  if (!data.member) return box(t("member.noMember"));
  return children(data.member, data.profile);
}
