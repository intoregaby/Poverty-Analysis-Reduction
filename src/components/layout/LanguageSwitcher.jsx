import React from "react";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, setLanguage } from "@/i18n";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";

  return (
    <label className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-2 py-1.5 text-[11.5px] text-sub shadow-sm">
      <Languages className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">Language</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        className="cursor-pointer bg-transparent font-medium text-ink outline-none"
        aria-label="Language"
      >
        {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
    </label>
  );
}
