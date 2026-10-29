// Plain-language labels for each worker stage, shown in the Thinking block and the task panel.
const n = (value) => (value == null ? null : Number(value).toLocaleString());

export const STAGE_INFO = {
  "Discovering Data": { active: "Reading the survey files", idle: "Find the files, tables and variables available for this district.", done: (c) => c?.files_discovered != null ? `Found ${n(c.files_discovered)} files, ${n(c.tables_inventoried)} tables and ${n(c.variables_inventoried)} variables` : "Mapped the available datasets" },
  "Checking Sources": { active: "Verifying official sources", idle: "Check publications and record where the evidence comes from.", done: (c) => c?.sources_verified != null ? `Verified ${n(c.sources_verified)} official sources` : "Checked official sources" },
  "Connecting Datasets": { active: "Linking tables that can be used together", idle: "Check which tables can safely be used together.", done: () => "Confirmed which tables are compatible" },
  "Analyzing Evidence": { active: "Calculating district figures", idle: "Calculate district figures from the survey data.", done: () => "Calculated survey-weighted district figures" },
  "Finding Drivers": { active: "Looking for factors linked to poverty", idle: "Look for factors linked to poverty, without assuming they cause it.", done: () => "Measured which household conditions line up with the gap" },
  "Comparing Districts": { active: "Comparing with similar districts", idle: "Compare the district with similar places and Rwanda.", done: () => "Compared with nearby districts and Rwanda" },
  "Reviewing Solutions": { active: "Reviewing evidence on responses", idle: "Review evidence for possible responses.", done: () => "Reviewed published evidence on possible responses" },
  "Preparing Findings": { active: "Preparing findings and reports", idle: "Save the findings and reports for your review.", done: () => "Findings and reports saved" },
};

export const isFinished = (stage) => ["Completed", "Warning", "Skipped"].includes(stage.status);

export function stageSummary(stage, counts) {
  const info = STAGE_INFO[stage.name];
  if (stage.status === "Running") return stage.work || info?.active || "Working…";
  if (stage.status === "Failed") return stage.errors?.[0] || "This step needs attention";
  if (isFinished(stage)) return info?.done?.(counts) || "Finished";
  return info?.idle || "Waiting for earlier steps";
}

// Start/finish times per stage, read from the worker's event log.
export function stageTimes(events = []) {
  const times = {};
  for (const event of events) {
    const entry = (times[event.stage] ||= {});
    if (event.status === "Running" && !entry.start) entry.start = Date.parse(event.at);
    if (["Completed", "Warning", "Failed", "Skipped"].includes(event.status)) entry.end = Date.parse(event.at);
  }
  return times;
}

export function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms) || ms < 0) return "";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export const clock = (value) => value ? new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Africa/Kigali" }) : "";
