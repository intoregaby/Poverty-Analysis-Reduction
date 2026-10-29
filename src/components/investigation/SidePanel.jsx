import React, { useEffect } from "react";
import { X } from "lucide-react";

// Right-hand drawer over the page. With overlay={false} it becomes a sticky column on large screens instead.
export default function SidePanel({ title, subtitle = null, icon: Icon, actions = null, wide = false, overlay = true, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <>
    <div className={`fixed inset-0 z-30 bg-[#0A2540]/25 ${overlay ? "" : "lg:hidden"}`} onClick={onClose} aria-hidden />
    <aside aria-label={title} className={`fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-hairline bg-white shadow-2xl animate-in slide-in-from-right duration-200 sm:w-[520px] ${overlay ? "lg:w-[560px] xl:w-[640px]" : "lg:sticky lg:top-0 lg:z-10 lg:h-screen lg:shrink-0 lg:self-start lg:shadow-none"} ${overlay ? "" : wide ? "lg:w-[560px] xl:w-[660px]" : "lg:w-[400px] xl:w-[420px]"}`}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-4">
        {Icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon className="h-4 w-4" /></span>}
        <div className="min-w-0 flex-1"><h2 className="truncate text-[13px] font-semibold text-ink">{title}</h2>{subtitle && <p className="truncate text-[11px] text-sub">{subtitle}</p>}</div>
        {actions}
        <button type="button" onClick={onClose} aria-label="Close panel" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-sub hover:bg-canvas hover:text-ink"><X className="h-4 w-4" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  </>;
}
