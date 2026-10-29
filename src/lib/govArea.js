import { BENEFICIARIES, PAYMENTS } from "@/data/programme";
import { DASHBOARD_DISTRICTS, NATIONAL_EICV7 } from "@/data/dashboardEvidence";

// What a government leader may see: the records of their own district, sector or cell, and nothing outside it.
// The survey (EICV7) is only published down to district level, so sector and cell figures come from the programme records.
export const GOV_TABS = [{ id: "overview", label: "Overview" }, { id: "beneficiaries", label: "Program Members" }, { id: "problems", label: "Delivery problems" }, { id: "reports", label: "Field reports" }, { id: "requests", label: "Programme requests" }, { id: "cooperatives", label: "Cooperatives" }];

export const LEVEL_LABEL = { gov_district: "District", gov_sector: "Sector", gov_cell: "Cell", platform_admin: "Platform" };

export function areaRecords(scope, districtChoice) {
  const district = scope.all ? districtChoice : scope.district;
  const records = BENEFICIARIES.filter((item) => item.district === district && (!scope.sector || item.sector === scope.sector) && (!scope.cell || item.cell === scope.cell));
  return { district, records };
}

export const surveyRow = (district) => DASHBOARD_DISTRICTS.find((row) => row.name === district) || null;
export { NATIONAL_EICV7 };

const issueCount = (person) => (["Pending", "Suspended"].includes(person.status) ? 1 : 0) + (person.health?.status === "Unpaid" ? 1 : 0);

// Problems recorded against people in the area. Each list holds only what the records say.
export function areaProblems(records) {
  const names = new Set(records.map((item) => item.name));
  const byName = new Map(records.map((item) => [item.name, item]));
  const payments = PAYMENTS.filter((item) => item.status !== "Delivered" && names.has(item.beneficiary)).map((item) => ({ ...item, person: byName.get(item.beneficiary) }));
  const enrolment = records.filter((item) => ["Pending", "Suspended"].includes(item.status));
  const health = records.filter((item) => ["Unpaid", "Expiring"].includes(item.health?.status));
  return { payments, enrolment, health };
}

// Groups the records by sector (or by cell once a single sector is in view), with the counts a leader acts on.
export function groupRecords(records, by) {
  const groups = new Map();
  for (const person of records) {
    const key = person[by] || "Not recorded";
    const row = groups.get(key) || { name: key, total: 0, active: 0, pending: 0, suspended: 0, healthUnpaid: 0, attention: 0 };
    row.total += 1;
    if (person.status === "Active") row.active += 1; else if (person.status === "Pending") row.pending += 1; else if (person.status === "Suspended") row.suspended += 1;
    if (person.health?.status === "Unpaid") row.healthUnpaid += 1;
    row.attention += issueCount(person);
    groups.set(key, row);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export const statusStyle = { Active: "bg-[#ECFDF3] text-[#067647]", Pending: "bg-[#FFFAEB] text-[#B54708]", Suspended: "bg-[#FEF3F2] text-[#B42318]" };
