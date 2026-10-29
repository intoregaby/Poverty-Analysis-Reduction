import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// One translation file per language. English is the fallback, and an empty Kinyarwanda value counts as missing,
// so a string that has not been translated yet shows in English instead of as a blank or a key.
export const LANGUAGES = [
  { code: "en", label: "English", locale: "en-RW" },
  { code: "rw", label: "Kinyarwanda", locale: "rw-RW" },
];
export const DEFAULT_LANGUAGE = "en";
export const isSupported = (code) => LANGUAGES.some((item) => item.code === code);

// `resources` is { en: {...}, rw: {...} }; the app passes the JSON files and the tests pass their own.
export function createI18n(resources, language = DEFAULT_LANGUAGE) {
  const instance = i18n.createInstance();
  instance.use(initReactI18next).init({
    resources: Object.fromEntries(Object.entries(resources).map(([code, translation]) => [code, { translation }])),
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}
