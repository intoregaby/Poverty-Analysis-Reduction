import React from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

const TONE = {
  verified_match: "bg-emerald-50 text-emerald-800 border-emerald-200",
  discrepancy_requires_review: "bg-red-50 text-red-800 border-red-200",
  methodology_mismatch: "bg-amber-50 text-amber-800 border-amber-200",
  not_externally_verified: "bg-slate-100 text-slate-700 border-slate-200",
  new_analytical_finding: "bg-indigo-50 text-indigo-800 border-indigo-200",
};

export function StatusChip({ status, children }) {
  return <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium leading-snug ${TONE[status] || TONE.not_externally_verified}`}>{children}</span>;
}

const Source = ({ row }) => <>{row.url ? <a href={row.url} target="_blank" rel="noopener noreferrer" className="break-words font-medium text-brand underline">{row.source}</a> : <span className="break-words">{row.source}</span>}</>;

function List({ title, text, tone = "text-ink" }) {
  return <p className="mt-1 text-[12px] leading-relaxed"><strong className="text-ink">{title}: </strong><span className={tone}>{text || "None"}</span></p>;
}

// The compact box shown in the workspace and at the top of the report, before anything is exported.
export function VerificationSummary({ section }) {
  if (!section) return null;
  const bad = section.available && section.unresolved > 0;
  const Icon = !section.available || bad ? AlertTriangle : ShieldCheck;
  return <div role="status" className={`flex items-start gap-2.5 rounded-lg border p-3 text-[12px] leading-relaxed ${bad ? "border-red-200 bg-red-50 text-red-900" : section.available ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
    <div>
      <p className="font-semibold">{section.available ? (bad ? "Evidence check: issues to resolve before relying on this report" : "Evidence check complete") : "Evidence check not run"}</p>
      <p className="mt-0.5">{section.headline}</p>
      {!section.available && section.reason && <p className="mt-0.5">{section.reason}</p>}
      {bad && <p className="mt-0.5">Unresolved: {section.unresolved_items.join(", ")}. The report lists them in section 5.</p>}
      {section.available && section.corrections.length > 0 && <p className="mt-0.5">{section.corrections.length} sentence{section.corrections.length === 1 ? " was" : "s were"} corrected because the wording did not match the data.</p>}
    </div>
  </div>;
}

export default function VerificationSection({ section }) {
  if (!section) return null;
  if (!section.available) return <VerificationSummary section={section} />;
  return <div className="space-y-3">
    <p className="text-[12.5px] leading-relaxed text-ink">{section.headline}</p>

    <table className="hidden w-full border-collapse text-left text-[11.5px] sm:table">
      <thead><tr className="border-b border-hairline text-[10px] uppercase tracking-[0.06em] text-sub">{["Indicator", "Internal result", "Official published result", "Source", "Verification"].map((name) => <th key={name} className="py-1.5 pr-2 font-semibold">{name}</th>)}</tr></thead>
      <tbody>{section.rows.map((row) => <tr key={row.indicator} data-pdf-unit className="border-b border-hairline align-top">
        <td className="py-2 pr-2 font-medium text-ink">{row.indicator}{row.estimate_type === "modelled" && <span className="block text-[10px] font-normal text-sub">modelled estimate</span>}</td>
        <td className="py-2 pr-2 tabular-nums text-ink">{row.internal}</td>
        <td className="py-2 pr-2 text-ink">{row.official}</td>
        <td className="py-2 pr-2 text-sub"><Source row={row} /></td>
        <td className="py-2"><StatusChip status={row.status}>{row.label}</StatusChip>{row.status !== "verified_match" && row.note && <p className="mt-1 text-[10.5px] leading-snug text-sub">{row.note}</p>}</td>
      </tr>)}</tbody>
    </table>
    <div className="space-y-2 sm:hidden">{section.rows.map((row) => <div key={row.indicator} data-pdf-unit className="rounded-lg border border-hairline p-2.5 text-[11.5px] leading-relaxed">
      <p className="font-semibold text-ink">{row.indicator}</p>
      <p><span className="text-sub">Internal result: </span><span className="tabular-nums text-ink">{row.internal}</span></p>
      <p><span className="text-sub">Official published result: </span>{row.official}</p>
      <p className="text-sub">Source: <Source row={row} /></p>
      <p className="mt-1"><StatusChip status={row.status}>{row.label}</StatusChip></p>
      {row.status !== "verified_match" && row.note && <p className="mt-1 text-[10.5px] leading-snug text-sub">{row.note}</p>}
    </div>)}</div>

    <div data-pdf-unit className="rounded-lg border border-hairline bg-canvas/60 p-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-sub">What was checked, and what was not</h4>
      <List title="Independently confirmed (the value matches NISR's published table)" text={section.lists.verified} />
      <List title="Discrepancies found" text={section.lists.discrepancies} tone={section.lists.discrepancies ? "font-medium text-red-800" : "text-ink"} />
      <List title="Cannot be compared because the definitions differ" text={section.lists.mismatches} />
      <List title="Not checked against any official figure" text={section.lists.unverified} />
      <List title="The engine's own analyses (no published counterpart)" text={section.lists.original} />
      <p className="mt-2 text-[11px] leading-relaxed text-sub">A match confirms that the number agrees with the publication. It does not prove that the internal calculation is correct in every respect. A mismatch is not an error: the two figures measure different things.</p>
    </div>

    {section.corrections.length > 0 && <div data-pdf-unit className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-900">Corrected during review</h4>
      <p className="mt-1 text-[11.5px] text-amber-900">These sentences did not match the data. Each was replaced by a sentence built from the data. The numbers were not changed.</p>
      <ul className="mt-2 space-y-2">{section.corrections.map((item, index) => <li key={`${item.path}-${index}`} className="text-[11.5px] leading-relaxed text-amber-950">
        <p><strong>Was:</strong> {item.original}</p><p><strong>Now:</strong> {item.corrected}</p><p className="text-amber-900">{item.reason}</p></li>)}</ul>
    </div>}

    {section.decomposition && <div data-pdf-unit className="rounded-lg border border-hairline p-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-sub">Review of the gap-splitting method (Oaxaca-Blinder)</h4>
      <p className="mt-1 text-[12px] text-ink">{section.decomposition.status === "Completed" ? <><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />All internal checks passed.</> : <><AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-red-600" />At least one check needs review.</>}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[11.5px] leading-relaxed text-ink">{section.decomposition.checks.map((item) => <li key={item.check}>{item.check}: {item.passed ? "passed" : "needs review"} ({String(item.observed)})</li>)}</ul>
      <p className="mt-2 text-[11px] font-semibold text-sub">What the method assumes</p>
      <ul className="list-disc space-y-1 pl-5 text-[11.5px] leading-relaxed text-ink">{section.decomposition.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
      {section.decomposition.reproduce && <p className="mt-2 text-[11px] leading-relaxed text-sub"><strong className="text-ink">To reproduce: </strong>{section.decomposition.reproduce}</p>}
    </div>}

    <div data-pdf-unit className="rounded-lg border border-hairline p-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-sub">Official documents read</h4>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[11.5px] leading-relaxed text-ink">{section.sources.map((item) => <li key={item.title} className="break-words">
        {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">{item.title}</a> : item.title}
        {item.available ? <span className="text-sub">, version {item.version}, retrieved {String(item.retrieved_at).slice(0, 10)}</span> : <span className="text-red-700"> (could not be retrieved: {item.error})</span>}</li>)}</ul>
      <p className="mt-2 text-[11px] text-sub">{section.audit_trail.length} checks are recorded in the audit trail saved with the investigation.</p>
    </div>
  </div>;
}
