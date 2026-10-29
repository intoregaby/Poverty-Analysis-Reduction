import { useCallback, useEffect, useState } from "react";

// Per-person preferences. Kept in this browser for now; the language is also saved on the person's profile once the
// account system is connected (see saveProfileLanguage in i18n/profileLanguage.js).
const KEY = "ireme_settings_v1";
const EVENT = "ireme-settings";
export const DEFAULT_SETTINGS = { notify: { app: true, sms: true, email: false } };

function read() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(window.localStorage.getItem(KEY)) }; } catch { return DEFAULT_SETTINGS; }
}

export function useUserSettings() {
  const [settings, setSettings] = useState(read);
  useEffect(() => {
    const sync = () => setSettings(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const update = useCallback((patch) => {
    const next = { ...read(), ...patch };
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* The change still applies for this visit. */ }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [settings, update];
}
