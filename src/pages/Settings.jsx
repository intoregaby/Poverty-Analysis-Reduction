import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, LogOut } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/analyst/Card";
import { LANGUAGES, setLanguage } from "@/i18n";
import { saveProfileLanguage } from "@/i18n/profileLanguage";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { useUserSettings } from "@/lib/userSettings";
import { useAuth } from "@/lib/AuthContext";
import { useDemoAuth, useRole } from "@/lib/DemoAuthContext";
import { ROLES } from "@/lib/roles";

const TABS = ["profile", "language", "notifications", "security"];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const role = useRole();
  const { demoUser, logout: demoLogout } = useDemoAuth();
  const { user, logout: realLogout } = useAuth();
  const [tab, setTab] = useState("profile");
  const [notice, setNotice] = useState("");
  const [settings, update] = useUserSettings();
  const language = i18n.resolvedLanguage || i18n.language;
  const account = demoUser || { name: user?.full_name || user?.email, scope: "", email: user?.email };

  const choose = async (code) => {
    await setLanguage(code);
    try { await saveProfileLanguage(code); } catch { /* The browser copy is still saved. */ }
    setNotice(t("settings.language.saved"));
  };

  return (
    <div className="pb-14">
      <PageHeader title={t("settings.title")} />
      <div className="mx-auto max-w-[900px] px-4 py-5 sm:px-6 lg:px-8">
        <p className="mb-4 text-[12px] text-sub">{t("settings.intro")}</p>
        <div role="tablist" aria-label={t("settings.title")} className="mb-4 flex gap-1 overflow-x-auto rounded-md bg-[#F1F4F9] p-0.5">
          {TABS.map((key) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setNotice(""); }}
              className={`shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-[12px] font-medium ${tab === key ? "bg-white text-ink shadow-sm" : "text-sub hover:text-ink"}`}>
              {t(`settings.tabs.${key}`)}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <Card title={t("settings.profile.title")}>
            <dl className="grid grid-cols-1 gap-3 text-[12.5px] sm:grid-cols-2">
              <div><dt className="text-[11px] text-sub">{t("settings.profile.name")}</dt><dd className="font-medium text-ink">{account.name || "—"}</dd></div>
              <div><dt className="text-[11px] text-sub">{t("settings.profile.role")}</dt><dd className="font-medium text-ink">{ROLES[role]?.label || "—"}</dd></div>
              <div><dt className="text-[11px] text-sub">{t("settings.profile.area")}</dt><dd className="font-medium text-ink">{account.scope || "—"}</dd></div>
              <div><dt className="text-[11px] text-sub">{t("settings.profile.email")}</dt><dd className="font-medium text-ink">{account.email || "—"}</dd></div>
            </dl>
            <p className="mt-3 text-[11px] text-sub">{t("settings.profile.note")}</p>
          </Card>
        )}

        {tab === "language" && (
          <Card title={t("settings.language.title")} subtitle={t("settings.language.help")}>
            <div role="radiogroup" aria-label={t("settings.language.title")} className="grid gap-2 sm:grid-cols-2">
              {LANGUAGES.map((item) => (
                <button key={item.code} type="button" role="radio" aria-checked={language === item.code} onClick={() => choose(item.code)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-[13px] ${language === item.code ? "border-brand bg-brand-soft font-medium text-brand" : "border-hairline text-ink hover:bg-canvas"}`}>
                  <span>{item.label}<span className="ml-2 text-[11px] uppercase text-sub">{item.code}</span></span>
                  {language === item.code && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              ))}
            </div>
            {notice && <p role="status" className="mt-3 text-[12px] text-pos">{notice}</p>}
            <div className="mt-5 rounded-lg border border-hairline bg-canvas/60 p-3">
              <p className="mb-2 text-[11px] font-medium text-sub">{t("settings.language.previewTitle")}</p>
              <ul className="space-y-1 text-[12.5px] text-ink">
                <li>{t("settings.language.date")}: {formatDate(new Date(), language)}</li>
                <li>{t("settings.language.number")}: {formatNumber(1234567.5, language)}</li>
                <li>{t("settings.language.money")}: {formatMoney(12500, language)}</li>
              </ul>
            </div>
          </Card>
        )}

        {tab === "notifications" && (
          <Card title={t("settings.notifications.title")} subtitle={t("settings.notifications.help")}>
            <ul className="divide-y divide-hairline/70">
              {["app", "sms", "email"].map((key) => (
                <li key={key} className="flex items-center justify-between py-2.5 text-[12.5px] text-ink">
                  <label htmlFor={`notify-${key}`}>{t(`settings.notifications.${key}`)}</label>
                  <input id={`notify-${key}`} type="checkbox" checked={Boolean(settings.notify[key])} onChange={(event) => update({ notify: { ...settings.notify, [key]: event.target.checked } })} className="h-4 w-4 accent-[#635BFF]" />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {tab === "security" && (
          <Card title={t("settings.security.title")} subtitle={t("settings.security.help")}>
            <button type="button" onClick={() => (demoUser ? demoLogout() : realLogout())} className="inline-flex items-center gap-2 rounded-md border border-hairline px-3 py-2 text-[12.5px] font-medium text-ink hover:bg-canvas">
              <LogOut className="h-4 w-4" aria-hidden="true" />{t("settings.security.signOut")}
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
