import React from "react";
import Card from "@/components/analyst/Card";

const basis = (text = "") => text.startsWith("Household-level") ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-brand";

export default function DataUsed({ dataUsed }) {
  if (!dataUsed) return null;
  const { used, not_yet_used: waiting, catalog } = dataUsed;
  return <Card title="Which data was used?" subtitle="Every result comes from supplied files; the label says how they were combined." inlineHelp
    info="Household-level linked means the same households were matched across tables. Aggregate comparison only means separate surveys were compared as area averages, with no household link, so differences are associations and not causes.">
    <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[11px]"><thead className="bg-[#F7F9FC] text-sub"><tr>{["Data", "Used for", "How combined"].map((label) => <th key={label} className="p-2 font-medium">{label}</th>)}</tr></thead>
      <tbody>{used.map((item) => <tr key={item.dataset} className="border-t border-hairline align-top"><td className="p-2"><p className="font-medium text-ink">{item.dataset}</p><p className="mt-0.5 break-all text-[10px] text-sub">{item.file || "Published tables"} · {item.status}</p></td><td className="p-2 text-sub">{item.used_for}</td><td className="p-2"><span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${basis(item.linkage)}`}>{item.linkage.split(":")[0]}</span><p className="mt-1 text-[10.5px] text-sub">{item.linkage.split(":").slice(1).join(":").trim()}</p></td></tr>)}</tbody></table></div>
    {catalog && <p className="mt-3 text-[11px] text-sub">All {catalog.variables_catalogued.toLocaleString()} variables in the supplied files are catalogued; {catalog.variables_marked_used} are validated for use so far.</p>}
    <details className="mt-3 text-[11px] text-sub"><summary className="cursor-pointer font-medium text-ink">Supplied data not yet used, and why</summary><ul className="mt-2 list-disc space-y-1 pl-4">{waiting.map((item) => <li key={item.dataset}><strong className="text-ink">{item.dataset}.</strong> {item.reason}</li>)}</ul></details>
  </Card>;
}
