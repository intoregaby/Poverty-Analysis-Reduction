// Dates, numbers and money in the reader's language. Pure Intl, so it works the same in the browser, in tests
// and in the USSD code.
const LOCALES = { en: "en-RW", rw: "rw-RW" };
export const localeFor = (language) => LOCALES[language] || LOCALES.en;

// Some runtimes do not ship Kinyarwanda data; fall back to English rather than throw.
function safe(language, build) {
  try { return build(localeFor(language)); } catch { return build(LOCALES.en); }
}

export const formatNumber = (value, language = "en", options = {}) =>
  Number.isFinite(Number(value)) ? safe(language, (locale) => new Intl.NumberFormat(locale, options).format(Number(value))) : "—";

export const formatMoney = (value, language = "en") =>
  Number.isFinite(Number(value)) ? `RWF ${formatNumber(Math.round(Number(value)), language, { maximumFractionDigits: 0 })}` : "—";

export const formatPercent = (fraction, language = "en", digits = 0) =>
  Number.isFinite(Number(fraction)) ? formatNumber(Number(fraction), language, { style: "percent", maximumFractionDigits: digits, minimumFractionDigits: digits }) : "—";

export function formatDate(value, language = "en", options = { day: "numeric", month: "short", year: "numeric" }) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : safe(language, (locale) => new Intl.DateTimeFormat(locale, { timeZone: "Africa/Kigali", ...options }).format(date));
}

export const formatDateTime = (value, language = "en") =>
  formatDate(value, language, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
