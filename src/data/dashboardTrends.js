import trends from "@/data/dashboard-trends.json";
import { DISTRICTS } from "@/data/nisr";

const provinceOf = new Map(DISTRICTS.map(({ name, province }) => [name, province]));
const withProvince = (row) => {
  const province = provinceOf.get(row.name);
  if (!province) throw new Error(`Missing province for ${row.name}`);
  return { ...row, province };
};

export const TREND_SOURCES = trends.sources;
export const TREND_NATIONAL = trends.national;
export const TREND_CHANGE_COUNTS = trends.changeCounts;
export const TREND_DISTRICTS = trends.districts.map(withProvince);
export const PANEL_MOBILITY = trends.panel;
export const ACCESS_DISTRICTS = trends.access.districts.map(withProvince);
export const ACCESS_LINKS = trends.access.links;
export const ACCESS_NATIONAL = trends.access.national;
export const FINSCOPE_TREND = trends.finscopeTrend;
export const FINSCOPE_SERIES = trends.finscopeSeries;
export const SERIES_PROVINCES = trends.finscopeSeries.provinces;
export const FINANCE_CHANGE_DISTRICTS = trends.finscopeTrend.districts.map(withProvince);

export const FINANCE_MEASURES = {
  excluded: { label: "No financial service", short: "Excluded", better: "fall", note: "Adults using neither a formal nor an informal product." },
  formal: { label: "Formally served", short: "Formal", better: "rise", note: "Adults using a bank or another regulated provider such as mobile money or a SACCO." },
  mobile_money: { label: "Mobile money", short: "Mobile money", better: "rise", note: "Registered mobile money users, estimated from the questionnaire in both years." },
  informal_only: { label: "Informal only", short: "Informal only", better: null, note: "Adults using only savings groups or informal lenders. A fall can mean a move to formal use or to none." },
};

export const TREND_PERIODS = {
  "2010_11_to_2013_14": { label: "2010/11 to 2013/14", from: "EICV3", to: "EICV4" },
  "2013_14_to_2016_17": { label: "2013/14 to 2016/17", from: "EICV4", to: "EICV5" },
};

export const linkReading = (link) => {
  const [low, high] = link.bootstrap_95_interval || [null, null];
  if (low === null) return "The uncertainty range could not be calculated.";
  const direction = link.spearman_rho > 0 ? "higher" : "lower";
  if (low > 0 || high < 0) return `The relationship is ${Math.abs(link.spearman_rho) >= 0.5 ? "moderate" : "weak"} and its range excludes zero, so some link between districts is likely; it still does not show cause.`;
  return `The range includes zero, so a ${direction}-with-poverty pattern is not established across 30 districts.`;
};
