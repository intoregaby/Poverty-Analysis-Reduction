import React, { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { navForRole, navSlug, ROLES } from "@/lib/roles";
import { buildTour, hasTour } from "@/components/tour/tours";

const visible = (node) => node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
// Finds the element a step points at, or null when it is missing or hidden. Steps only use data-tour markers.
export function resolveStep(step) {
  if (step.target) {
    const roots = [...document.querySelectorAll(`[data-tour="${step.target}"]`)].filter(visible);
    if (!step.selector) return roots[0] || null;
    for (const root of roots) {
      const inside = [...root.querySelectorAll(step.selector)].find(visible);
      if (inside) return inside;
    }
    return null;
  }
  return null;
}

const isNarrow = () => window.matchMedia("(max-width: 1023px)").matches;

export default function GuidedTour({ role, scope, request = 0, onMenuChange }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [steps, setSteps] = useState([]);
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState(null);
  const [position, setPosition] = useState({ top: 16, left: 16 });
  const contentRef = useRef(null);
  const startedFor = useRef(null);
  const handled = useRef(0);
  const direction = useRef(1);
  const storageKey = `ireme-tour-v4:${scope}:${pathname}`;

  const start = useCallback((checkNow = true) => {
    const items = navForRole(role).flatMap((group) => group.items);
    // Steps that point at something missing on this screen are left out.
    const all = buildTour(pathname, items);
    const usable = checkNow ? all.filter((item) => item.soft || item.menu || resolveStep(item)) : all;
    if (!usable.length) return;
    startedFor.current = pathname;
    setSteps(usable);
    setStep(0);
    setRect(null);
    setActive(true);
  }, [role, pathname]);

  const finish = useCallback(() => {
    try { localStorage.setItem(storageKey, "1"); } catch { /* Closing must work without storage. */ }
    setActive(false);
    onMenuChange(false);
  }, [storageKey, onMenuChange]);

  // First visit: show the tour once, on the person's home page only.
  useEffect(() => {
    if (request > 0 || handled.current > 0 || !hasTour(pathname) || ROLES[role]?.home !== pathname) return undefined;
    let seen = false;
    try { seen = localStorage.getItem(storageKey) === "1"; } catch { /* Storage can be disabled. */ }
    if (seen) return undefined;
    const timer = setTimeout(() => start(false), 1200);
    return () => clearTimeout(timer);
  }, [storageKey, start, request, pathname, role]);

  useEffect(() => {
    if (request > 0 && request !== handled.current) { handled.current = request; start(); }
  }, [request, start]);

  // Moving to another page ends the tour for the old page.
  useEffect(() => {
    if (active && startedFor.current && startedFor.current !== pathname) { setActive(false); onMenuChange(false); }
  }, [pathname, active, onMenuChange]);

  const item = steps[step];
  const menuPages = navForRole(role).flatMap((group) => group.items).filter((entry) => entry.to !== pathname).map((entry) => t(`nav.${navSlug(entry.to)}`)).join(", ");

  useEffect(() => {
    if (!active || !item) return undefined;
    const wantsMenu = Boolean(item.menu) && isNarrow();
    onMenuChange(wantsMenu);
    let frame;
    let last;
    let missingSince = null;
    const measure = () => {
      const element = resolveStep(item);
      if (!element && !item.soft && !item.menu) {
        missingSince ??= Date.now();
        if (Date.now() - missingSince > 1500) {
          setStep((current) => Math.min(steps.length - 1, Math.max(0, current + direction.current)));
          return;
        }
      } else missingSince = null;
      if (element && element !== last) {
        last = element;
        const tall = element.getBoundingClientRect().height > window.innerHeight * 0.55;
        element.scrollIntoView({ block: tall || window.innerWidth < 640 ? "start" : "center", behavior: "instant" });
        if (tall || window.innerWidth < 640) window.scrollBy(0, -76);
      }
      const bounds = element?.getBoundingClientRect();
      const inView = bounds && bounds.bottom > 0 && bounds.top < window.innerHeight;
      const top = inView ? Math.max(0, bounds.top) : 0;
      const nextRect = inView ? { top, left: bounds.left, width: bounds.width, height: Math.min(bounds.bottom, window.innerHeight - 4) - top } : null;
      setRect((old) => (JSON.stringify(old) === JSON.stringify(nextRect) ? old : nextRect));

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(340, vw - 24);
      const height = contentRef.current?.offsetHeight || 240;
      const clampLeft = (value) => Math.max(12, Math.min(value, vw - width - 12));
      const clampTop = (value) => Math.max(12, Math.min(value, vh - height - 12));
      let next;
      if (!nextRect) next = { left: clampLeft((vw - width) / 2), top: clampTop((vh - height) / 2) };
      else if (vw < 640) next = { left: 12, top: nextRect.top + nextRect.height / 2 > vh * 0.55 && nextRect.height < vh * 0.5 ? 12 : vh - height - 12 };
      else if (vw - nextRect.left - nextRect.width >= width + 28) next = { left: nextRect.left + nextRect.width + 16, top: clampTop(nextRect.top) };
      else if (vh - (nextRect.top + nextRect.height) >= height + 28) next = { left: clampLeft(nextRect.left), top: nextRect.top + nextRect.height + 14 };
      else if (nextRect.top >= height + 28) next = { left: clampLeft(nextRect.left), top: nextRect.top - height - 14 };
      else next = { left: clampLeft(vw - width - 16), top: vh - height - 16 };
      setPosition((old) => (old.top === next.top && old.left === next.left ? old : next));
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    const sizeObserver = new ResizeObserver(schedule);
    if (contentRef.current) sizeObserver.observe(contentRef.current);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    schedule();
    const recheck = setTimeout(schedule, 1700);
    return () => {
      clearTimeout(recheck);
      cancelAnimationFrame(frame);
      observer.disconnect();
      sizeObserver.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [active, item, steps.length, onMenuChange]);

  if (!item) return null;
  const StepIcon = item.icon;
  const last = step === steps.length - 1;

  return (
    <Dialog.Root open={active} onOpenChange={(isOpen) => { if (!isOpen) finish(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60]" />
        {rect ? (
          <div aria-hidden="true" className="pointer-events-none fixed z-[61] rounded-md ring-2 ring-brand transition-all duration-150"
            style={{ top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10, boxShadow: "0 0 0 9999px rgba(10,37,64,0.22)" }} />
        ) : <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[61] bg-[#0A2540]/20" />}
        <Dialog.Content ref={contentRef}
          className="fixed z-[62] max-h-[calc(100dvh-24px)] w-[340px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-xl border border-hairline bg-white shadow-[0_12px_40px_rgba(10,37,64,0.22)] outline-none"
          style={position} onPointerDownOutside={(event) => event.preventDefault()}>
          <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
            <div aria-live="polite" aria-atomic="true">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-brand">{t("tour.stepOf", { current: step + 1, total: steps.length })}</p>
              <Dialog.Title className="mt-0.5 flex items-center gap-2 text-[14px] font-semibold text-ink">{StepIcon && <StepIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />}{t(item.titleKey, { ...item.titleValues, page: item.titleValues ? t(item.titleValues.page) : undefined })}</Dialog.Title>
            </div>
            <Dialog.Close className="rounded-md p-1 text-sub hover:text-ink" aria-label={t("tour.close")}><X className="h-4 w-4" /></Dialog.Close>
          </div>
          <div className="px-4 py-3">
            <Dialog.Description className="text-[13px] leading-relaxed text-ink">{t(item.textKey, { pages: menuPages })}</Dialog.Description>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3">
            <button type="button" onClick={() => { direction.current = -1; setStep((current) => current - 1); }} disabled={step === 0} className="flex items-center gap-1 text-[12.5px] font-medium text-sub hover:text-ink disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" />{t("tour.back")}</button>
            {!last && <button type="button" onClick={finish} className="text-[12.5px] text-sub hover:text-ink">{t("tour.skip")}</button>}
            <button type="button" onClick={() => { direction.current = 1; if (last) finish(); else setStep((current) => current + 1); }} className="flex items-center gap-1 rounded-md bg-brand px-3 py-2 text-[12.5px] font-medium text-white hover:bg-brand/90">{last ? t("tour.finish") : t("tour.next")}{!last && <ChevronRight className="h-3.5 w-3.5" />}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
