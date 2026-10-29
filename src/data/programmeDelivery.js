import { AGENTS, BENEFICIARIES } from "@/data/programme";
import { NATIONAL_EICV7 } from "@/data/dashboardEvidence";
import { isOpen } from "@/lib/actionRequests";

// What the Programme panel knows about delivery in each district, shaped for the analyst dashboards.
// SAMPLE DATA: the registry covers only the seven districts where the sample has agents, and the October
// payment ledger below is simulated from the registry (stable for each beneficiary) because the sample
// payments table has only eight rows. Replace `octoberOutcome` with the real payments table when it is connected.
export const DELIVERY_NOTE = "Sample programme records for 7 districts. Counts are records, not coverage rates: the sample has no population denominator.";

// Some districts are given a higher chance of trouble so the sample tells a story that matches the sample requests.
const PROPENSITY = { default: { fail: 0.03, pending: 0.05 }, Kamonyi: { fail: 0.12, pending: 0.06 }, Nyaruguru: { fail: 0.04, pending: 0.12 }, Nyamagabe: { fail: 0.07, pending: 0.04 } };

function unit(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return ((hash >>> 0) % 10000) / 10000;
}

export function octoberOutcome(beneficiary) {
  if (beneficiary.status !== "Active") return null;
  const chance = PROPENSITY[beneficiary.district] || PROPENSITY.default;
  const roll = unit(`${beneficiary.id}:2024-10`);
  return roll < chance.fail ? "Failed" : roll < chance.fail + chance.pending ? "Pending" : "Delivered";
}

const empty = (district) => ({ district, enrolled: 0, active: 0, pending: 0, suspended: 0, enrolmentIssueShare: 0, payments: { total: 0, delivered: 0, failed: 0, pending: 0, problemRate: 0 }, healthLapseShare: 0, agents: 0 });

function build() {
  const by = new Map();
  for (const person of BENEFICIARIES) {
    const row = by.get(person.district) || empty(person.district);
    row.enrolled += 1;
    if (person.status === "Active") row.active += 1; else if (person.status === "Pending") row.pending += 1; else if (person.status === "Suspended") row.suspended += 1;
    if (person.health?.status && person.health.status !== "Paid") row.healthLapseShare += 1;
    const outcome = octoberOutcome(person);
    if (outcome) { row.payments.total += 1; row.payments[outcome.toLowerCase()] += 1; }
    by.set(person.district, row);
  }
  for (const agent of AGENTS) { const row = by.get(agent.district); if (row) row.agents += 1; }
  for (const row of by.values()) {
    row.enrolmentIssueShare = row.enrolled ? (row.pending + row.suspended) / row.enrolled : 0;
    row.healthLapseShare = row.enrolled ? row.healthLapseShare / row.enrolled : 0;
    row.payments.problemRate = row.payments.total ? (row.payments.failed + row.payments.pending) / row.payments.total : 0;
  }
  return by;
}

const REGISTRY = build();

// Delivery figures for one district, joined with the live action requests so analysts see what they have already asked for.
export function districtDelivery(name, requests = []) {
  const base = REGISTRY.get(name) || empty(name);
  const mine = requests.filter((item) => item.district === name);
  return { ...base, hasRecords: base.enrolled > 0, requests: { open: mine.filter((item) => isOpen(item.status)).length, completed: mine.filter((item) => item.status === "Completed").length } };
}

// One plain-language flag per district, in the order an analyst should read them.
export function deliverySignal(row, delivery) {
  const above = row.poverty >= NATIONAL_EICV7.poverty;
  if (!delivery.hasRecords) return above ? { id: "gap", rank: 2, label: "High poverty, none in sample", tone: "bad" } : { id: "none", rank: 4, label: "Not in sample registry", tone: "mute" };
  if (delivery.payments.total >= 20 && delivery.payments.problemRate >= 0.1) return { id: "payments", rank: 0, label: "Payment problems", tone: "warn" };
  if (delivery.enrolmentIssueShare >= 0.18) return { id: "enrolment", rank: 1, label: "Enrolment issues", tone: "warn" };
  return { id: "ok", rank: 3, label: "No flags in records", tone: "good" };
}

export function deliverySummary(rows, requests = []) {
  const items = rows.map((row) => { const delivery = districtDelivery(row.name, requests); return { row, delivery, signal: deliverySignal(row, delivery) }; });
  const withRecords = items.filter((item) => item.delivery.hasRecords);
  const total = withRecords.reduce((sum, item) => sum + item.delivery.payments.total, 0);
  const problems = withRecords.reduce((sum, item) => sum + item.delivery.payments.failed + item.delivery.payments.pending, 0);
  return { items, districtsWithRecords: withRecords.length, paymentProblemRate: total ? problems / total : 0, paymentsTotal: total, gaps: items.filter((item) => item.signal.id === "gap").length, flagged: items.filter((item) => ["payments", "enrolment"].includes(item.signal.id)).length };
}

// A short factual line for the AI, so its answers can mention delivery without inventing it.
export function deliveryForAi(name, requests = []) {
  const d = districtDelivery(name, requests);
  if (!d.hasRecords) return { district: name, text: `No programme delivery records exist for ${name} in the sample registry.` };
  const pct = (value) => `${(value * 100).toFixed(0)}%`;
  return { district: name, text: `Programme delivery records for ${name} (SAMPLE registry from the Programme panel, not survey data): ${d.enrolled} program members (${d.active} active, ${d.pending} pending, ${d.suspended} suspended); October payments: ${d.payments.total} due, ${d.payments.delivered} delivered, ${d.payments.failed} failed, ${d.payments.pending} pending (${pct(d.payments.problemRate)} with a problem); ${pct(d.healthLapseShare)} of program members have a health-insurance lapse; ${d.agents} field agents; analyst requests: ${d.requests.open} open, ${d.requests.completed} completed.` };
}
