import React from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const BRAND = "#635BFF";
const MUTED = "#A3ADBD";
const axis = { fontSize: 10, fill: "#697386" };
const tip = { contentStyle: { border: "1px solid #E5E9F0", borderRadius: 8, fontSize: 11 } };
const pct = (value) => `${Number(value).toFixed(1)}%`;

function Frame({ title, caption, height, children }) {
  return <figure className="mt-4 rounded-lg border border-hairline bg-white p-3">
    <figcaption className="text-[11px] font-semibold text-ink">{title}</figcaption>
    <div className="mt-2 w-full" style={{ height }}>{children}</div>
    {caption && <p className="mt-1.5 text-[10px] leading-relaxed text-sub">{caption}</p>}
  </figure>;
}

function Findings({ result }) {
  const rows = (result.findings?.findings || []).filter((item) => item.national != null).map((item) => ({ name: item.title.length > 26 ? `${item.title.slice(0, 25)}…` : item.title, District: item.value, Rwanda: item.national }));
  if (!rows.length) return null;
  return <Frame title="Key findings against Rwanda" caption={`Share of ${result.findings?.findings?.[0]?.unit || "people"}, EICV7 2023/24.`} height={Math.max(180, rows.length * 54 + 40)}>
    <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ left: 4, right: 36, top: 4, bottom: 4 }}><CartesianGrid stroke="#EEF1F5" horizontal={false} /><XAxis type="number" domain={[0, "dataMax"]} tick={axis} unit="%" /><YAxis type="category" dataKey="name" width={130} tick={{ ...axis, fill: "#425466" }} /><Tooltip formatter={(v) => pct(v)} {...tip} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="District" fill={BRAND} radius={[0, 3, 3, 0]} maxBarSize={14} isAnimationActive={false}><LabelList dataKey="District" position="right" formatter={pct} style={{ fontSize: 9, fill: "#425466" }} /></Bar><Bar dataKey="Rwanda" fill={MUTED} radius={[0, 3, 3, 0]} maxBarSize={14} isAnimationActive={false} /></BarChart></ResponsiveContainer>
  </Frame>;
}

function Comparison({ result }) {
  const c = result.comparison;
  if (!c) return null;
  const rows = [c.district, ...(c.comparators || []), { ...c.national, district: "Rwanda" }];
  return <Frame title="Poverty rate: district, peers and Rwanda" caption="Share of people below the poverty line. Peers are same-province districts nearest in observed poverty rate." height={rows.length * 34 + 40}>
    <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ left: 4, right: 36, top: 2, bottom: 2 }}><CartesianGrid stroke="#EEF1F5" horizontal={false} /><XAxis type="number" domain={[0, "dataMax"]} tick={axis} unit="%" /><YAxis type="category" dataKey="district" width={92} tick={{ ...axis, fill: "#425466" }} /><Tooltip formatter={(v) => [pct(v), "Poverty"]} {...tip} /><Bar dataKey="poverty" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>{rows.map((row, index) => <Cell key={row.district} fill={index === 0 ? BRAND : row.district === "Rwanda" ? "#425466" : MUTED} />)}<LabelList dataKey="poverty" position="right" formatter={pct} style={{ fontSize: 10, fill: "#425466" }} /></Bar></BarChart></ResponsiveContainer>
  </Frame>;
}

function Drivers({ result }) {
  const groups = result.drivers?.groups;
  if (!groups?.length) return null;
  const rows = [...groups].sort((a, b) => Math.abs(b.contribution_points) - Math.abs(a.contribution_points)).slice(0, 8).map((g) => ({ name: g.label.length > 30 ? `${g.label.slice(0, 29)}…` : g.label, points: Number(g.contribution_points.toFixed(2)), grade: g.grade }));
  return <Frame title="What lines up with the gap to Rwanda" caption={`Percentage-point contribution of each household factor group. Associations, not causes. Faded bars are not established.`} height={rows.length * 30 + 50}>
    <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ left: 4, right: 36, top: 2, bottom: 2 }}><CartesianGrid stroke="#EEF1F5" horizontal={false} /><XAxis type="number" tick={axis} /><YAxis type="category" dataKey="name" width={150} tick={{ ...axis, fill: "#425466" }} /><Tooltip formatter={(v) => [`${v} points`, "Contribution"]} {...tip} /><Bar dataKey="points" radius={[0, 3, 3, 0]} maxBarSize={14} isAnimationActive={false}>{rows.map((row) => <Cell key={row.name} fill={row.points >= 0 ? BRAND : MUTED} fillOpacity={row.grade === "Not established" ? 0.4 : 1} />)}<LabelList dataKey="points" position="right" style={{ fontSize: 9, fill: "#425466" }} /></Bar></BarChart></ResponsiveContainer>
  </Frame>;
}

function Depth({ result }) {
  const depth = result.drivers?.depth;
  if (!depth) return null;
  const rows = [["Headcount", "headcount_pct"], ["Poverty gap", "poverty_gap_pct"], ["Severity", "severity_pct"]].map(([name, key]) => ({ name, District: depth.district[key], Rwanda: depth.national[key] }));
  return <Frame title="How deep is poverty?" caption="Headcount is how many are poor; the gap and severity show how far below the line they fall." height={200}>
    <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ left: -10, right: 8, top: 14, bottom: 0 }}><CartesianGrid stroke="#EEF1F5" vertical={false} /><XAxis dataKey="name" tick={{ ...axis, fill: "#425466" }} /><YAxis tick={axis} unit="%" /><Tooltip formatter={(v) => pct(v)} {...tip} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="District" fill={BRAND} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}><LabelList dataKey="District" position="top" formatter={pct} style={{ fontSize: 9, fill: "#425466" }} /></Bar><Bar dataKey="Rwanda" fill={MUTED} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} /></BarChart></ResponsiveContainer>
  </Frame>;
}

export default function ReportChart({ kind, result }) {
  if (!result) return null;
  if (kind === "findings") return <Findings result={result} />;
  if (kind === "comparison") return <Comparison result={result} />;
  if (kind === "drivers") return <Drivers result={result} />;
  if (kind === "depth") return <Depth result={result} />;
  return null;
}
