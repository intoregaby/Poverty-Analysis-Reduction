import { useCallback, useEffect, useState } from "react";
import { DASHBOARD_DISTRICTS } from "@/data/dashboardEvidence";
import { AGENTS } from "@/data/programme";

// Action requests: an analyst asks a programme team to do something, and the answer comes back to the analyst.
// Stored in this browser (sample data). The same module is used by the Analyst and Programme panels,
// so both always see the same requests. A server table can replace `readAll` and `writeAll` later.
const KEY = "ireme_action_requests_v2";
const EVENT = "ireme-action-requests";

export const REQUEST_TYPES = [
  { id: "verify", label: "Verify on the ground", hint: "Agents check a finding with households or local offices." },
  { id: "targeting", label: "Review targeting", hint: "Check who is enrolled and who is left out." },
  { id: "coverage", label: "Close a coverage gap", hint: "Poor households are not reaching a programme." },
  { id: "payments", label: "Check payments", hint: "Payments are late, failing or unverified." },
  { id: "data", label: "Provide programme data", hint: "The analyst needs records to finish the analysis." },
];
export const PROGRAMME_NAMES = ["VUP Direct Support", "Girinka Munyarwanda", "Expanded Public Works", "Nsymibondo y'Icyaro"];
export const PRIORITIES = ["High", "Medium", "Low"];
export const STATUSES = ["Submitted", "Accepted", "In progress", "Completed", "Declined", "Withdrawn"];

// Who may move a request, and to where.
const FLOW = { Submitted: ["Accepted", "Declined", "Withdrawn"], Accepted: ["In progress", "Declined"], "In progress": ["Completed"], Completed: [], Declined: [], Withdrawn: [] };
export const nextStatuses = (status) => FLOW[status] || [];
export const isOpen = (status) => !["Completed", "Declined", "Withdrawn"].includes(status);
export const typeLabel = (id) => REQUEST_TYPES.find((item) => item.id === id)?.label || id;

const daysAgo = (days, hours = 0) => new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString();
const inDays = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const poverty = (name) => DASHBOARD_DISTRICTS.find((item) => item.name === name);

function seed() {
  const row = (name) => poverty(name);
  const analyst = { name: "Mugisha Eric", role: "nisr_analyst" };
  const agentOf = (programme, district) => AGENTS.find((agent) => agent.programme === programme && agent.district === district)?.name || "Programme team";
  const epwAgent = agentOf("Expanded Public Works", "Nyaruguru");
  const owner = { name: "VUP Secretariat", role: "programme_owner" };
  const epwOwner = { name: "Public Works Office", role: "programme_owner" };
  const girinkaOwner = { name: "Girinka Office", role: "programme_owner" };
  const make = (n, fields) => ({ id: `AR-${String(n).padStart(4, "0")}`, sample: true, runId: null, ...fields });
  const line = (name) => (row(name) ? [{ label: "Poverty rate", value: `${row(name).poverty.toFixed(1)}% of people, EICV7 2023/24` }, { label: "Extreme poverty", value: `${row(name).extremePoverty.toFixed(1)}% of people` }] : []);
  return [
    make(1, { district: "Nyaruguru", type: "verify", programme: "Expanded Public Works", priority: "High", title: "Verify who is reached by public works in Nyaruguru", ask: "Visit the sectors with the highest poverty and confirm how many poor households took part in public works this year. Report anyone eligible who was not reached.", evidence: line("Nyaruguru"), context: "Poverty here is among the highest in the country and the survey shows low participation among poor households.", createdBy: analyst, createdAt: daysAgo(6), status: "In progress", assignee: epwAgent, due: inDays(5), history: [{ at: daysAgo(6), by: analyst.name, status: "Submitted", note: "Request created from a district investigation." }, { at: daysAgo(5), by: epwOwner.name, status: "Accepted", note: "Assigned to the Nyaruguru field agent." }, { at: daysAgo(3), by: epwAgent, status: "In progress", note: "Visits started in the sectors with the highest poverty." }], outcome: null }),
    make(2, { district: "Gisagara", type: "targeting", programme: "VUP Direct Support", priority: "Medium", title: "Review VUP targeting in Gisagara", ask: "Compare the households receiving direct support with the poorest households listed by sector leaders, and report people who appear to be missing.", evidence: line("Gisagara"), context: "Poverty is well above the national rate. Survey participation in VUP among poor households is close to the national figure, so targeting needs a check.", createdBy: analyst, createdAt: daysAgo(1, 3), status: "Submitted", assignee: null, due: null, history: [{ at: daysAgo(1, 3), by: analyst.name, status: "Submitted", note: "Request created from a district investigation." }], outcome: null }),
    make(3, { district: "Nyamagabe", type: "payments", programme: "VUP Direct Support", priority: "High", title: "Failed mobile-money payments in Nyamagabe", ask: "Find why October payments failed for some program members and retry them.", evidence: line("Nyamagabe"), context: "The analyst noticed a gap between enrolled and verified households.", createdBy: analyst, createdAt: daysAgo(14), status: "Completed", assignee: "Keza Aline", due: daysAgo(4).slice(0, 10), history: [{ at: daysAgo(14), by: analyst.name, status: "Submitted", note: "Request created from a district investigation." }, { at: daysAgo(13), by: owner.name, status: "Accepted", note: "Assigned to Keza Aline." }, { at: daysAgo(12), by: "Keza Aline", status: "In progress", note: "Contacting the mobile-money provider." }, { at: daysAgo(5), by: "Keza Aline", status: "Completed", note: "Payments retried and confirmed." }], outcome: { note: "Eleven payments had failed because of outdated phone numbers. Numbers were corrected with program members and all payments were retried and delivered.", by: "Keza Aline", at: daysAgo(5) } }),
    make(4, { district: "Huye", type: "coverage", programme: "Girinka Munyarwanda", priority: "Low", title: "Extend Girinka to two Huye sectors", ask: "Check whether Girinka can reach two sectors with the lowest livestock ownership.", evidence: line("Huye"), context: "Livestock ownership is low in these sectors.", createdBy: analyst, createdAt: daysAgo(9), status: "Declined", assignee: null, due: null, history: [{ at: daysAgo(9), by: analyst.name, status: "Submitted", note: "Request created from a district investigation." }, { at: daysAgo(8), by: girinkaOwner.name, status: "Declined", note: "The Girinka budget for this year is fully allocated. Please resubmit for next year's plan." }], outcome: null }),
  ];
}

function readAll() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage unavailable: fall through to the sample data */ }
  const fresh = seed();
  try { window.localStorage.setItem(KEY, JSON.stringify(fresh)); } catch { /* keep the in-memory copy */ }
  return fresh;
}

function writeAll(list) {
  try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVENT));
}

export function createRequest(input, by) {
  const list = readAll();
  const number = list.reduce((max, item) => Math.max(max, Number(item.id.replace(/\D/g, "")) || 0), 0) + 1;
  const now = new Date().toISOString();
  const item = {
    id: `AR-${String(number).padStart(4, "0")}`, sample: false, runId: input.runId || null, district: input.district, type: input.type, programme: input.programme, priority: input.priority,
    title: input.title.trim().slice(0, 140), ask: input.ask.trim().slice(0, 1200), evidence: (input.evidence || []).slice(0, 8), context: String(input.context || "").slice(0, 600),
    createdBy: by, createdAt: now, status: "Submitted", assignee: null, due: input.due || null,
    history: [{ at: now, by: by.name, status: "Submitted", note: String(by.role || "").startsWith("gov_") ? "Request sent from the Government panel." : "Request created from a district investigation." }], outcome: null,
  };
  writeAll([item, ...list]);
  return item;
}

// Moves a request along its workflow. Declining needs a reason and completing needs the outcome, so the analyst always gets an answer.
export function advanceRequest(id, { to, by, note = "", assignee, due, outcome }) {
  const list = readAll();
  const item = list.find((entry) => entry.id === id);
  if (!item) throw new Error("This request no longer exists.");
  if (!nextStatuses(item.status).includes(to)) throw new Error(`A ${item.status.toLowerCase()} request cannot be moved to ${to.toLowerCase()}.`);
  if (to === "Declined" && !note.trim()) throw new Error("Give a reason so the analyst understands the decision.");
  if (to === "Completed" && !String(outcome || "").trim()) throw new Error("Describe what was found or done before completing the request.");
  const now = new Date().toISOString();
  const updated = {
    ...item, status: to, assignee: assignee ?? item.assignee, due: due ?? item.due,
    outcome: to === "Completed" ? { note: String(outcome).trim().slice(0, 1500), by: by.name, at: now } : item.outcome,
    history: [...item.history, { at: now, by: by.name, status: to, note: (to === "Completed" ? note || "Completed." : note).trim().slice(0, 600) }],
  };
  writeAll(list.map((entry) => (entry.id === id ? updated : entry)));
  return updated;
}

// The analyst decides, answer by answer, whether the AI may use a programme team's finding. Default: yes.
export function setAiInclude(id, include) {
  writeAll(readAll().map((item) => (item.id === id ? { ...item, aiInclude: Boolean(include) } : item)));
}

const FINDING_MAX_AGE_DAYS = 180;

// Completed answers for one district that the AI may read. Old ones expire on their own.
export function findingsForAi(district, list, now = Date.now()) {
  return list
    .filter((item) => item.district === district && item.status === "Completed" && item.outcome?.note && item.aiInclude !== false)
    .filter((item) => (now - Date.parse(item.outcome.at)) / 86400000 <= FINDING_MAX_AGE_DAYS)
    .sort((a, b) => Date.parse(b.outcome.at) - Date.parse(a.outcome.at))
    .slice(0, 5)
    .map((item) => ({ id: item.id, title: item.title, programme: item.programme, by: item.outcome.by, date: item.outcome.at.slice(0, 10), note: item.outcome.note.slice(0, 600) }));
}

export function resetSampleRequests() {
  writeAll(seed());
}

export function useActionRequests() {
  const [requests, setRequests] = useState(() => readAll());
  useEffect(() => {
    const refresh = () => setRequests(readAll());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(EVENT, refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const create = useCallback((input, by) => createRequest(input, by), []);
  const advance = useCallback((id, update) => advanceRequest(id, update), []);
  const setInclude = useCallback((id, include) => setAiInclude(id, include), []);
  return { requests, create, advance, setInclude };
}

export function requestStats(list) {
  const done = list.filter((item) => item.status === "Completed");
  const days = done.map((item) => (Date.parse(item.outcome?.at || item.history.at(-1).at) - Date.parse(item.createdAt)) / 86400000).filter((value) => value >= 0);
  return {
    waiting: list.filter((item) => item.status === "Submitted").length,
    active: list.filter((item) => ["Accepted", "In progress"].includes(item.status)).length,
    completed: done.length,
    declined: list.filter((item) => item.status === "Declined").length,
    averageDays: days.length ? days.reduce((sum, value) => sum + value, 0) / days.length : null,
  };
}

export const actorFrom = (demoUser, fallbackRole = "nisr_analyst") => ({ name: demoUser?.name || "Analyst", role: demoUser?.role || fallbackRole });
