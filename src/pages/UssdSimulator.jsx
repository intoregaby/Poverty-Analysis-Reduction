import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Phone, PhoneOff, Send } from "lucide-react";
import { SERVICE_CODE } from "@/ussd/gateway";
import { SESSION_TIMEOUT_MS } from "@/ussd/core";

// A phone-style USSD simulator for demos and tests, for people who have no internet on their own phone.
// It talks to the same edge function a real operator will call, through the SimulatorGateway format.
// Public page: it only serves demo members (the function refuses real people in simulator mode).
const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ussd`;
const DEMO_PHONES = ["+250788000001", "+250788000002", "+250788000003"];

const newRef = () => `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function UssdSimulator() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState(DEMO_PHONES[0]);
  const [dialled, setDialled] = useState(SERVICE_CODE);
  const [input, setInput] = useState("");
  const [screen, setScreen] = useState(null); // { text, end, system? }
  const [ref, setRef] = useState(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const lastSeen = useRef(0);
  const inputRef = useRef(null);

  const call = useCallback(async (sessionRef, text) => {
    setBusy(true);
    lastSeen.current = Date.now(); // the countdown must never see "no activity yet" while a request is in flight
    try {
      const response = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionRef, phone, input: text }) });
      const reply = await response.json();
      setScreen({ text: reply.text, end: Boolean(reply.end) });
      lastSeen.current = Date.now();
      setLeft(reply.end ? 0 : SESSION_TIMEOUT_MS);
      if (reply.end) setRef(null);
    } catch {
      setScreen({ text: t("ussdSim.network"), end: true, system: true });
      setRef(null);
    } finally { setBusy(false); setInput(""); }
  }, [phone, t]);

  // The countdown mirrors the server's idle timeout, so a demo shows what a real phone would do.
  useEffect(() => {
    if (!ref || screen?.end) return undefined;
    const timer = setInterval(() => {
      const remaining = SESSION_TIMEOUT_MS - (Date.now() - lastSeen.current);
      if (remaining <= 0) { setScreen({ text: t("ussdSim.timedOut"), end: true, system: true }); setRef(null); setLeft(0); } else setLeft(remaining);
    }, 500);
    return () => clearInterval(timer);
  }, [ref, screen, t]);

  useEffect(() => { if (ref && !busy) inputRef.current?.focus(); }, [ref, busy, screen]);

  const dial = () => {
    if (dialled.trim() !== SERVICE_CODE) { setScreen({ text: t("ussdSim.badCode"), end: true, system: true }); setRef(null); return; }
    const next = newRef();
    setRef(next);
    call(next, "");
  };
  const send = (event) => { event.preventDefault(); if (ref && input.trim() !== "" && !busy) call(ref, input.trim()); };
  const hangUp = () => { setRef(null); setScreen(null); setLeft(0); setInput(""); };

  const live = Boolean(ref) && !screen?.end;
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-6" data-tour="ussd-sim">
      <div className="w-full max-w-[360px]">
        <h1 className="mb-1 text-center text-[16px] font-semibold text-ink">{t("ussdSim.title")}</h1>
        <p className="mb-4 text-center text-[11.5px] text-sub">{t("ussdSim.help")}</p>
        <div className="rounded-[28px] border-4 border-[#1D2939] bg-[#101828] p-3 shadow-xl">
          <div className="min-h-[230px] rounded-xl bg-[#E8F1E4] p-3 font-mono text-[13px] leading-snug text-[#12351A]" role="status" aria-live="polite">
            {screen ? <pre className="whitespace-pre-wrap break-words font-mono">{screen.text}</pre> : <p className="text-[#4B6B50]">{t("ussdSim.idle", { code: SERVICE_CODE })}</p>}
            {live && <p className="mt-3 text-[10.5px] text-[#4B6B50]">{t("ussdSim.timeLeft", { seconds: Math.ceil(left / 1000) })}</p>}
          </div>

          {live ? (
            <form onSubmit={send} className="mt-3 flex gap-2">
              <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} inputMode="numeric" autoComplete="off" aria-label={t("ussdSim.reply")} placeholder={t("ussdSim.reply")} disabled={busy}
                className="min-w-0 flex-1 rounded-md bg-white px-3 py-2.5 text-[15px] text-ink outline-none" />
              <button type="submit" disabled={busy || !input.trim()} className="grid h-11 w-11 place-items-center rounded-md bg-[#12B76A] text-white disabled:opacity-40" aria-label={t("ussdSim.send")}><Send className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" onClick={hangUp} className="grid h-11 w-11 place-items-center rounded-md bg-[#F04438] text-white" aria-label={t("ussdSim.cancel")}><PhoneOff className="h-4 w-4" aria-hidden="true" /></button>
            </form>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="block text-[11px] text-[#98A2B3]">{t("ussdSim.yourNumber")}
                <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" list="demo-phones" className="mt-1 w-full rounded-md bg-white px-3 py-2 text-[14px] text-ink outline-none" />
                <datalist id="demo-phones">{DEMO_PHONES.map((item) => <option key={item} value={item} />)}</datalist>
              </label>
              <div className="flex gap-2">
                <input value={dialled} onChange={(event) => setDialled(event.target.value)} aria-label={t("ussdSim.code")} className="min-w-0 flex-1 rounded-md bg-white px-3 py-2.5 text-center text-[17px] tracking-wider text-ink outline-none" />
                <button type="button" onClick={dial} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#12B76A] px-4 text-[13px] font-medium text-white disabled:opacity-40"><Phone className="h-4 w-4" aria-hidden="true" />{t("ussdSim.dial")}</button>
              </div>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-[10.5px] text-[#8A94A6]">{t("ussdSim.demoOnly")}</p>
      </div>
    </main>
  );
}
