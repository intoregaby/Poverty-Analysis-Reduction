import React, { useEffect, useState } from "react";
import Card from "@/components/analyst/Card";
import { request } from "@/lib/investigationApi";

const signed = (value) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

export default function PriorityBoard({ onOpen, disabled }) {
  const [board, setBoard] = useState(null);
  const [all, setAll] = useState(false);
  useEffect(() => { request("/board").then(setBoard).catch(() => setBoard({ districts: [] })); }, []);
  if (!board || !board.districts.length) return null;
  const rows = all ? board.districts : board.districts.slice(0, 10);
  return <Card title="Where districts differ most from Rwanda" subtitle={`${board.districts_included} of ${board.districts_expected} districts compared`} inlineHelp info={board.note}>
    <p className="text-[11px] leading-relaxed text-sub">{board.note}</p>
    {board.missing.length > 0 && <p className="mt-2 rounded-md bg-amber-50 p-2 text-[11px] text-amber-800">Not yet compared: {board.missing.join(", ")}.</p>}
    <ol className="mt-2">{rows.map((row) => <li key={row.district} className="border-t border-hairline py-2 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="w-6 text-[12px] tabular-nums text-sub">{row.rank}</span>
        <button type="button" disabled={disabled} onClick={() => onOpen(row.district)} className="text-[13px] font-semibold text-brand hover:underline disabled:opacity-60">{row.district}</button>
        <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">{row.clear_count} clear</span>
        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{row.possible_count} possible</span>
      </div>
      <ul className="mt-1 space-y-0.5 pl-9">{row.clear_signals.slice(0, 3).map((item) => <li key={item.id} className="text-[11px] text-ink">{item.label}: <span className="tabular-nums">{item.district_pct}% vs {item.rwanda_pct}%</span> <span className="text-sub">({signed(item.difference_points)} pt, {item.reliability})</span></li>)}</ul>
    </li>)}</ol>
    {board.districts.length > 10 && <button type="button" onClick={() => setAll(!all)} className="mt-2 text-[12px] font-medium text-brand hover:underline">{all ? "Show top 10" : `Show all ${board.districts.length}`}</button>}
  </Card>;
}
