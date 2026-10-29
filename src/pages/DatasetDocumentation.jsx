import React, { useState } from "react";
import { FileCheck2, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/analyst/Card";
import PanelGuide from "@/components/analyst/PanelGuide";
import { DATASETS, INDICATORS } from "@/data/datasets";

export default function DatasetDocumentation() {
  const [activeId, setActiveId] = useState(DATASETS[0].id);
  const active = DATASETS.find((d) => d.id === activeId);

  return (
    <div className="pb-14">
      <PageHeader
        title="Data Sources"
        badge={
          <span className="hidden items-center gap-1.5 rounded-full border border-hairline px-2 py-[3px] text-[11px] text-sub sm:inline-flex">
            <FileCheck2 className="h-3 w-3 text-pos" />
            {DATASETS.length} sources · CSV
          </span>
        }
      />

      <PanelGuide id="data-sources" title="Data Sources">
        This page lists every dataset behind the numbers on this dashboard. Click a row to see its
        details. All files are available in CSV format for download from NISR.
      </PanelGuide>

      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4" data-tour="ds-intro">
          <h2 className="text-[20px] font-semibold tracking-tight text-ink">Where the Data Comes From</h2>
          <p className="mt-0.5 text-[12px] text-sub">Every figure traces back to one of these files</p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card tour="ds-list" title="Datasets" subtitle="Cleaned NISR and FinScope files · CSV format" className="xl:col-span-2" bodyClassName="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-y border-hairline bg-[#FAFBFD] text-[10.5px] uppercase tracking-[0.06em] text-[#8A94A6]">
                    <th className="py-2 pl-5 pr-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Dataset</th>
                    <th className="px-3 py-2 text-left font-medium">Source</th>
                    <th className="px-3 py-2 text-left font-medium">Year</th>
                    <th className="px-3 py-2 text-left font-medium">Level</th>
                    <th className="px-3 py-2 text-left font-medium">Format</th>
                    <th className="py-2 pl-3 pr-5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {DATASETS.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setActiveId(d.id)}
                      className={`cursor-pointer border-b border-hairline/70 transition-colors last:border-0 ${
                        activeId === d.id ? "bg-brand-soft" : "hover:bg-[#FAFBFD]"
                      }`}
                    >
                      <td className="py-2.5 pl-5 pr-2 tabular-nums text-sub">{d.rank}</td>
                      <td className="px-3 py-2.5 font-medium text-ink">{d.name}</td>
                      <td className="px-3 py-2.5 text-sub">{d.source}</td>
                      <td className="px-3 py-2.5 tabular-nums text-sub">{d.year}</td>
                      <td className="px-3 py-2.5 text-sub">{d.level}</td>
                      <td className="px-3 py-2.5 text-sub">{d.format}</td>
                      <td className="py-2.5 pl-3 pr-5 text-right">
                        {d.ci ? (
                          <span className="inline-flex rounded-full border border-[#ABEFC6] bg-[#ECFDF3] px-2 py-[2px] text-[10.5px] font-medium text-[#067647]">
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-[#FEDF89] bg-[#FFFAEB] px-2 py-[2px] text-[10.5px] font-medium text-[#B54708]">
                            Method note pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card title={active.name} subtitle={`${active.source} · ${active.year}`} info="This shows details about the dataset you chose: who made it, which year it is from, and what it tells us.">
              <dl className="space-y-3">
                <div>
                  <dt className="text-[10.5px] uppercase tracking-[0.06em] text-[#8A94A6]">Records</dt>
                  <dd className="mt-0.5 text-[12px] text-ink">{active.records} · {active.sample}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-[0.06em] text-[#8A94A6]">Fields</dt>
                  <dd className="mt-0.5 text-[12px] text-ink">{active.fields}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-[0.06em] text-[#8A94A6]">Indicator definition</dt>
                  <dd className="mt-0.5 text-[12px] leading-relaxed text-ink">{active.definition}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-[0.06em] text-[#8A94A6]">Methodology</dt>
                  <dd className="mt-0.5 text-[12px] leading-relaxed text-ink">{active.method}</dd>
                </div>
              </dl>
            </Card>

            <Card
              title="Confidence Intervals"
              subtitle="How precise each number is"
              info="Confidence intervals show the range around each number. A wide range means the estimate is less certain. These will appear once NISR method notes are added."
            >
              <div className="flex items-start gap-2.5 rounded-lg border border-[#FEDF89] bg-[#FFFAEB] px-3 py-2.5">
                <ShieldAlert className="mt-px h-4 w-4 shrink-0 text-[#B54708]" />
                <p className="text-[11.5px] leading-relaxed text-[#B54708]">
                  Awaiting NISR method notes. Intervals will show next to each estimate, with the design effect.
                </p>
              </div>
            </Card>
          </div>
        </div>

        <Card
          tour="ds-dictionary" title="Indicator Dictionary"
          subtitle="What each number means"
          className="mt-4"
          info="Plain-language definitions for every indicator used across the dashboard. Use this as a glossary when you see a term you don't understand."
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {INDICATORS.map((i) => (
              <div key={i.name} className="flex gap-3 border-b border-hairline/70 pb-2 last:border-0">
                <span className="w-[130px] shrink-0 text-[12px] font-medium text-ink">{i.name}</span>
                <span className="text-[11.5px] leading-relaxed text-sub">{i.definition}</span>
              </div>
            ))}
          </div>
        </Card>

        <p className="mt-5 text-[10.5px] text-[#8A94A6]">
          Source files: NISR EICV3–EICV6, FinScope 2016–2024, VUP coverage 2023/24. All datasets are available in CSV format from the NISR website (statistics.gov.rw).
        </p>
      </div>
    </div>
  );
}