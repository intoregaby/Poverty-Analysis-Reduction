import React, { useMemo, useState } from "react";
import AnalystTopbar from "@/components/analyst/AnalystTopbar";
import KpiStrip from "@/components/analyst/KpiStrip";
import PovertyByDistrictChart from "@/components/analyst/PovertyByDistrictChart";
import MoversCard from "@/components/analyst/MoversCard";
import AccessCard from "@/components/analyst/AccessCard";
import TrendChangeCard from "@/components/analyst/TrendChangeCard";
import PanelMobilityCard from "@/components/analyst/PanelMobilityCard";
import DistrictAccessCard from "@/components/analyst/DistrictAccessCard";
import AccessPovertyCard from "@/components/analyst/AccessPovertyCard";
import FinanceChangeCard from "@/components/analyst/FinanceChangeCard";
import FinanceSeriesCard from "@/components/analyst/FinanceSeriesCard";
import PanelGuide from "@/components/analyst/PanelGuide";
import { DASHBOARD_DISTRICTS, DASHBOARD_SOURCES } from "@/data/dashboardEvidence";
import { Link, useOutletContext } from "react-router-dom";
import { Search, CircleHelp } from "lucide-react";

const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;

export default function AnalystDashboard() {
  const { startTour } = /** @type {{ startTour: () => void }} */ (useOutletContext());
  const [province, setProvince] = useState("all");
  const rows = useMemo(
    () => province === "all" ? DASHBOARD_DISTRICTS : DASHBOARD_DISTRICTS.filter((row) => row.province === province),
    [province]
  );
  const investigationDistrict = province === "all" ? "Gisagara" : rows[0]?.name;

  const handleExport = () => {
    const header = ["district", "province", "poverty_people_2023_24_pct", "extreme_poverty_people_2023_24_pct", "poverty_people_2016_17_modelled_pct", "published_poverty_decrease_points", "vup_participation_surveyed_poor_households_2023_24_pct", "sample_households", "sample_poor_households"];
    const data = rows.map((row) => [row.name, row.province, row.poverty, row.extremePoverty, row.previousModelled, row.publishedDecrease, row.vupAmongPoor, row.sampleHouseholds, row.samplePoorHouseholds]);
    const csv = [header, ...data].map((record) => record.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `nisr-poverty-${province === "all" ? "rwanda" : province.toLowerCase().replace(/\s+/g, "-")}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="pb-14">
      <AnalystTopbar province={province} onProvinceChange={setProvince} onExport={handleExport} />
      <PanelGuide id="analyst-dashboard" title="Poverty Analysis">
        Use the province filter to compare districts. The eye icon explains each chart; the amber triangle opens a data note where our figure differs from NISR's; the sparkles icon opens the existing AI preview. National-only figures stay labelled as national.
      </PanelGuide>

      <main className="mx-auto max-w-[1440px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        <section aria-labelledby="main-findings-title" data-tour="analysis-findings">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="main-findings-title" className="text-[20px] font-semibold tracking-tight text-ink">Poverty Analysis Dashboard</h2><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={startTour} className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3 py-2 text-[12px] font-medium text-ink hover:bg-canvas"><CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />How to read this page</button><Link to={`/investigations?district=${encodeURIComponent(investigationDistrict)}&autoStart=1`} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-[12px] font-medium text-white hover:bg-[#524BE0]"><Search className="h-3.5 w-3.5" />Run Investigation · {investigationDistrict}</Link></div></div>
          <p className="mb-3 mt-0.5 text-[12px] text-sub">Dashboard shows which districts in Rwanda need support by comparing local poverty levels to the national average.</p>
          <KpiStrip rows={rows} province={province} />
        </section>

        <div data-tour="analysis-poverty-chart"><PovertyByDistrictChart rows={rows} province={province} /></div>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <div data-tour="analysis-changes"><MoversCard rows={rows} /></div>
          <div data-tour="analysis-finance"><AccessCard province={province} /></div>
        </div>

        <section aria-labelledby="trends-title" className="space-y-4">
          <div><h2 id="trends-title" className="text-[16px] font-semibold tracking-tight text-ink">Trends and Financial Inclusion</h2><p className="mt-0.5 text-[12px] text-sub">Poverty over time from earlier surveys, who escaped poverty, and how financial access lines up with poverty by district. Each card says whether it follows the same households or only compares area averages.</p></div>
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            <TrendChangeCard rows={rows} />
            <PanelMobilityCard province={province} />
          </div>
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            <DistrictAccessCard rows={rows} />
            <FinanceChangeCard rows={rows} />
          </div>
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            <FinanceSeriesCard rows={rows} />
            <AccessPovertyCard rows={rows} province={province} />
          </div>
        </section>

        <p data-tour="analysis-sources" className="text-[10.5px] leading-relaxed text-[#8A94A6]">
          <a href={DASHBOARD_SOURCES.poverty} target="_blank" rel="noreferrer" className="underline underline-offset-2">NISR EICV7, 2023/24</a> supplies poverty estimates; its VUP modules supply reported household participation. <a href={DASHBOARD_SOURCES.change} target="_blank" rel="noreferrer" className="underline underline-offset-2">NISR's modelled 2016/17 comparison</a> supplies the earlier poverty rates. <a href={DASHBOARD_SOURCES.financial} target="_blank" rel="noreferrer" className="underline underline-offset-2">FinScope 2024</a> supplies the adult financial Access Strand, nationally and by district. The earlier EICV3, EICV4 and EICV5 poverty files and the EICV3–EICV4 panel supply the trend cards. District estimates have uncertainty; differences between measures do not establish causes or programme eligibility.
        </p>
      </main>
    </div>
  );
}
