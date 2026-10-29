import React from "react";

export function Basis({ linked = false }) {
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${linked ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-brand"}`}>{linked ? "Household-level linked" : "Aggregate comparison only"}</span>;
}

export function Segmented({ label, options, value, onChange }) {
  return <div role="group" aria-label={label} className="mt-3 flex w-fit max-w-full flex-wrap rounded-md bg-[#F1F4F9] p-0.5">
    {options.map((option) => <button key={option.key} type="button" aria-pressed={value === option.key} onClick={() => onChange(option.key)}
      className={`rounded px-2.5 py-1.5 text-[11px] font-medium transition-colors ${value === option.key ? "bg-white text-ink shadow-sm" : "text-sub hover:text-ink"}`}>{option.label}</button>)}
  </div>;
}

export function Legend({ items }) {
  return <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-sub">{items.map((item) => <li key={item.label} className="inline-flex items-center gap-1.5">
    <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${item.hollow ? "border-2 bg-white" : "border border-black/5"}`} style={item.hollow ? { borderColor: item.color } : { backgroundColor: item.color }} />{item.label}</li>)}</ul>;
}

export function ViewTable({ head, rows, label = "View as a table" }) {
  return <details className="mt-3 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">{label}</summary>
    <div className="mt-2 max-h-[280px] overflow-auto"><table className="w-full min-w-[420px] text-left"><thead className="sticky top-0 bg-[#F7F9FC]"><tr>{head.map((cell) => <th key={cell} className="p-2 font-medium">{cell}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row[0]} className="border-t border-hairline">{row.map((cell, index) => <td key={`${row[0]}-${index}`} className={`p-2 ${index ? "tabular-nums" : "text-ink"}`}>{cell}</td>)}</tr>)}</tbody></table></div></details>;
}

export const tooltipStyle = { borderRadius: 8, border: "1px solid #E3E8EE", fontSize: 11, color: "#0A2540", boxShadow: "0 8px 24px rgba(10,37,64,0.12)" };
