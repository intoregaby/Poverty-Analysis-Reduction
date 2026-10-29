import React, { useState } from "react";

// Plain-language glossary for technical terms used across the dashboard.
// Hover or tap any <Term>word</Term> to see its meaning.
export const TERMS = {
  indicator:
    "A number that measures something — for example, the poverty rate tells you what share of people are poor.",
  household:
    "A group of people who live together and share meals and expenses. Usually a family, but can be one person living alone.",
  "national poverty line":
    "The minimum money a person needs per year for basic food and essentials. In Rwanda it is RWF 560,127 per person per year (about RWF 1,535 per day). Anyone below this is counted as poor.",
  "extreme poverty line":
    "When a person cannot even afford enough food. In Rwanda this is RWF 370,966 per person per year.",
  "financial inclusion":
    "When people can use banks, mobile money and savings groups. It means adults can save, borrow and make payments safely.",
  vup:
    "Vision 2020 Umurenge Programme — the government's main social protection programme giving cash, public-works jobs and savings support to poor families.",
  coverage:
    "The share of poor households that actually receive help. If coverage is low, many poor families are being missed.",
  "formal financial service":
    "A bank, mobile money account, SACCO (savings cooperative) or microfinance — any licensed financial service.",
  "mobile money":
    "A service that lets you send, receive and save money using your phone, without a bank account. 86% of Rwandan adults use it.",
  sacco:
    "Savings and Credit Cooperative — a community group where members save and borrow together.",
  quintile:
    "When we divide all households into 5 equal groups from poorest to richest. The bottom quintile is the poorest 20%.",
  eicv:
    "Integrated Household Living Conditions Survey — NISR's main survey that measures poverty by asking thousands of households about their spending.",
  finscope:
    "A survey that measures how adults access and use financial services like banks, mobile money and savings groups.",
  "percentage point":
    "The difference between two percentages. If poverty falls from 40% to 30%, that is a 10 percentage-point drop — not a 10% drop.",
  "consumption aggregate":
    "The total value of everything a household consumes in a year — food, housing, education. NISR uses this to decide if a household is poor.",
  "adult equivalent":
    "A way of counting household size that accounts for children needing less than adults. Used to compare poverty fairly across different family sizes.",
  "confidence interval":
    "A range showing how precise a number is. A wide range means the estimate is less certain. Example: 27.4% ± 1% means the true value is likely between 26.4% and 28.4%.",
};

export default function Term({ children, term }) {
  const key = (term || children || "").toLowerCase();
  const def = TERMS[key];
  const [open, setOpen] = useState(false);

  if (!def) return <span>{children}</span>;

  return (
    <span className="relative inline-block">
      <span
        className="cursor-help border-b border-dotted border-[#8A94A6] text-inherit hover:border-ink hover:text-ink"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {children}
      </span>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-40 mb-2 w-60 -translate-x-1/2 rounded-lg border border-hairline bg-white p-3 text-[11px] leading-relaxed text-ink shadow-[0_8px_24px_rgba(10,37,64,0.15)]"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <span className="block font-semibold text-brand mb-0.5">{children}</span>
          {def}
        </span>
      )}
    </span>
  );
}