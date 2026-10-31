import React from "react";

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f3f4f2] px-4 py-10 text-foreground">
      <div className="w-full max-w-[400px]">
        <header className="mb-7 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-ink text-sm font-semibold tracking-tight text-white shadow-sm" aria-label="Ireme Insight">
            IR
          </div>
          <h1 className="text-[24px] font-medium tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-sub">{subtitle}</p>}
        </header>

        <section className="rounded-xl border border-[#e2e4e1] bg-white p-7 shadow-sm sm:p-8">
          {children}
          {footer && <div className="mt-7 border-t border-[#eceeeb] pt-5 text-center text-sm text-sub">{footer}</div>}
        </section>

        <p className="mt-7 text-center text-[11px] text-sub">
          NISR Big Data Hackathon · Track 2
        </p>
      </div>
    </main>
  );
}
