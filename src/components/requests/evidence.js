// Turns a finished investigation into the facts a programme team needs, so the request stands on its own.
export function evidenceFrom(result) {
  const lead = result?.findings?.findings?.[0];
  const rows = [];
  if (lead) rows.push({ label: lead.title, value: `${lead.value.toFixed(1)}%${lead.national != null ? ` (Rwanda ${lead.national.toFixed(1)}%)` : ""}, ${lead.period || "EICV7 2023/24"}` });
  for (const item of (result?.findings?.findings || []).slice(1, 4)) {
    // A finding with an earlier value is a change over time, so say that instead of repeating the current rate.
    if (item.earlier_value != null) rows.push({ label: "Change since 2016/17", value: `${item.earlier_value.toFixed(1)}% modelled in 2016/17 to ${item.value.toFixed(1)}% observed in 2023/24 (same method)` });
    else rows.push({ label: item.title, value: `${item.value.toFixed(1)}%${item.national != null ? ` (Rwanda ${item.national.toFixed(1)}%)` : ""}` });
  }
  const top = [...(result?.drivers?.groups || [])].sort((a, b) => Math.abs(b.contribution_points) - Math.abs(a.contribution_points))[0];
  if (top) rows.push({ label: "Largest factor linked to the gap", value: `${top.label}, ${top.contribution_points > 0 ? "+" : ""}${top.contribution_points.toFixed(1)} points (an association, not a proven cause)` });
  return rows.slice(0, 6);
}

export function contextFrom(result) {
  const brief = result?.analyst_brief;
  return [brief?.headline, brief?.decision].filter(Boolean).join(" ").slice(0, 600);
}

export function suggestPriority(result) {
  const lead = result?.findings?.findings?.[0];
  if (!lead || lead.national == null) return "Medium";
  const gap = lead.value - lead.national;
  return gap >= 15 ? "High" : gap >= 8 ? "Medium" : "Low";
}
