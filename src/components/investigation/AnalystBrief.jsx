import React from "react";
import Card from "@/components/analyst/Card";

export default function AnalystBrief({ brief }) {
  if (!brief) return null;
  return <Card title="Analyst conclusion" subtitle={`${brief.district} · ${brief.period}`} info="This conclusion is assembled from the verified survey calculations. It separates the measured problem, observed patterns and the next evidence needed. It does not assert a causal explanation or approve a programme." inlineHelp>
    <p className="text-[15px] font-semibold leading-relaxed text-ink">{brief.headline}</p>
    <div className="mt-3 grid gap-3 lg:grid-cols-2">{brief.observations.map((item) => <article key={item.id} className="rounded-lg bg-[#F7F9FC] p-3"><h3 className="text-[12px] font-semibold text-ink">{item.title}</h3><p className="mt-1.5 text-[12px] leading-relaxed text-ink">{item.text}</p><p className="mt-2 text-[11px] leading-relaxed text-sub">{item.meaning}</p><p className="mt-2 text-[11px] leading-relaxed text-sub"><strong className="text-ink">Investigate next:</strong> {item.next_step}</p></article>)}</div>
    <p className="mt-3 text-[11.5px] leading-relaxed text-ink">{brief.decision}</p>
    <p className="mt-2 text-[11px] leading-relaxed text-sub">{brief.support_question}</p>
    <details className="mt-3 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">Coverage and interpretation</summary><p className="mt-2">{brief.coverage}</p><p className="mt-2">{brief.interpretation}</p></details>
  </Card>;
}
