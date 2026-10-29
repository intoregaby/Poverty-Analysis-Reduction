import { useCallback, useEffect, useState } from "react";

// Problems that cell, sector and district leaders report from the field. A report is seen by its own area and by every level above it.
// Stored in this browser until there is a server table; the list starts empty, nothing here is pre-filled.
const KEY = "ireme_gov_issues_v1";
const EVENT = "ireme-gov-issues";

export const ISSUE_KINDS = ["Family left out of a programme", "Payment problem", "Health cover problem", "Cooperative concern", "Other"];
export const ISSUE_STATUSES = ["Open", "Seen", "Resolved"];

function readAll() {
  try { const raw = window.localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* storage unavailable */ }
  return [];
}
function writeAll(list) {
  try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVENT));
}

// Which reports a leader may read: the whole district, their sector, or their cell.
export function visibleIssues(list, scope, district) {
  return list.filter((item) => item.district === district && (!scope.sector || item.sector === scope.sector) && (!scope.cell || item.cell === scope.cell || scope.role !== "gov_cell"));
}

// District leaders may update any report in the district; sector leaders those in their sector. Cell leaders only report.
export const canUpdateIssue = (scope, item) => scope.all || scope.role === "gov_district" || (scope.role === "gov_sector" && item.sector === scope.sector);

export function createIssue(input, by) {
  if (!input.title?.trim() || input.title.trim().length < 4) throw new Error("Give the problem a short title.");
  if (!input.note?.trim()) throw new Error("Describe what you found.");
  if (!input.sector) throw new Error("Choose the sector.");
  const list = readAll();
  const number = list.reduce((max, item) => Math.max(max, Number(item.id.replace(/\D/g, "")) || 0), 0) + 1;
  const now = new Date().toISOString();
  const item = { id: `GI-${String(number).padStart(4, "0")}`, kind: input.kind, title: input.title.trim().slice(0, 120), note: input.note.trim().slice(0, 1200), district: input.district, sector: input.sector, cell: input.cell || "", createdBy: by, createdAt: now, status: "Open", history: [{ at: now, by: by.name, status: "Open", note: "Reported." }] };
  writeAll([item, ...list]);
  return item;
}

export function updateIssue(id, { status, note = "" }, by) {
  if (!ISSUE_STATUSES.includes(status)) throw new Error("Choose a valid status.");
  const list = readAll();
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error("This report no longer exists.");
  const now = new Date().toISOString();
  writeAll(list.map((item) => (item.id === id ? { ...item, status, history: [...item.history, { at: now, by: by.name, status, note: note.trim().slice(0, 400) }] } : item)));
}

export function useGovIssues() {
  const [issues, setIssues] = useState(() => readAll());
  useEffect(() => {
    const refresh = () => setIssues(readAll());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(EVENT, refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const create = useCallback((input, by) => createIssue(input, by), []);
  const update = useCallback((id, patch, by) => updateIssue(id, patch, by), []);
  return { issues, create, update };
}
