import React, { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";

export default function PanelGuide({ id, title, children }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(`guide-${id}`)) setOpen(true);
  }, [id]);

  if (!open) return null;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-ink">{title}</p>
          <div className="mt-0.5 text-[11.5px] leading-relaxed text-sub">{children}</div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(`guide-${id}`, "1");
            setOpen(false);
          }}
          className="shrink-0 text-sub hover:text-ink"
          aria-label="Dismiss guide"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}