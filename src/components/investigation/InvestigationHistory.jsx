import React, { useEffect, useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertCircle, Clock3, Eye, Loader2, Trash2 } from "lucide-react";
import Status from "./InvestigationStatus";

const canDelete = (item) => ["Completed", "Warning", "Failed", "Skipped"].includes(item.status);
const formatDate = (value) => value ? new Date(value).toLocaleString("en-GB", { timeZone: "Africa/Kigali", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Date unavailable";

export default function InvestigationHistory({ history, activeId, onOpen, onDelete }) {
  const [selected, setSelected] = useState(new Set());
  const [pending, setPending] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const allRef = useRef(null);
  const eligible = history.filter(canDelete);
  const chosen = eligible.filter((item) => selected.has(item.id));
  const allSelected = eligible.length > 0 && chosen.length === eligible.length;
  useEffect(() => { if (allRef.current) allRef.current.indeterminate = chosen.length > 0 && !allSelected; }, [chosen.length, allSelected]);

  const toggle = (id) => setSelected((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const remove = async () => {
    setDeleting(true); setError(""); setMessage("");
    try {
      const response = await onDelete(pending);
      setSelected((previous) => new Set([...previous].filter((id) => !response.deleted.includes(id))));
      setMessage(response.deleted.length ? `${response.deleted.length} investigation${response.deleted.length === 1 ? "" : "s"} deleted from history.` : "No investigations were deleted.");
      if (response.skipped.length) setError(`${response.skipped.length} could not be deleted. ${response.skipped[0].reason}`);
      setPending([]);
    } catch (failure) { setError(failure.message); setPending([]); }
    finally { setDeleting(false); }
  };

  return <section data-tour="inv-history" aria-labelledby="history-title" className="rounded-xl border border-hairline bg-white p-4 shadow-[0_2px_8px_rgba(10,37,64,0.04)] sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-brand" /><h2 id="history-title" className="text-[14px] font-semibold text-ink">Investigation history</h2><span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] tabular-nums text-sub">{history.length}</span></div><p className="mt-1.5 text-[11px] text-sub">Reopen a saved run, or select the ones you want to delete.</p></div>{chosen.length > 0 && <button type="button" disabled={deleting} onClick={() => { setError(""); setPending(chosen.map((item) => item.id)); }} className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete selected ({chosen.length})</button>}</div>
    {message && <p role="status" className="mt-3 rounded-md bg-[#EAF7F0] px-3 py-2 text-[11px] text-[#147D4B]">{message}</p>}
    {error && <p role="alert" className="mt-3 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-[11px] text-red-700"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}
    {history.length > 0 ? <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-canvas/60 px-3 py-2.5"><label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-ink"><input ref={allRef} type="checkbox" aria-label="Select all saved investigations" checked={allSelected} disabled={deleting || !eligible.length} onChange={() => setSelected(allSelected ? new Set() : new Set(eligible.map((item) => item.id)))} className="h-4 w-4 cursor-pointer rounded border-hairline accent-[#635BFF] disabled:cursor-not-allowed" />Select all <span className="font-normal text-sub">{chosen.length ? `· ${chosen.length} selected` : `· ${eligible.length} available`}</span></label><span className="text-[10px] text-sub">Active runs cannot be deleted · Rwanda time</span></div>
      <ul className="mt-2 max-h-[520px] space-y-2 overflow-y-auto pr-1">{history.map((item) => <li key={item.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 sm:gap-3 ${selected.has(item.id) ? "border-brand/40 bg-brand-soft/30" : item.id === activeId ? "border-brand/40 bg-white" : "border-hairline bg-white"}`}>
        <input type="checkbox" checked={selected.has(item.id) && canDelete(item)} disabled={deleting || !canDelete(item)} onChange={() => toggle(item.id)} aria-label={`Select ${item.district} investigation from ${formatDate(item.started_at)}`} className="h-4 w-4 shrink-0 cursor-pointer rounded border-hairline accent-[#635BFF] disabled:cursor-not-allowed disabled:opacity-40" />
        <button type="button" onClick={() => onOpen(item)} disabled={deleting} aria-label={`Open ${item.district} investigation from ${formatDate(item.started_at)}`} className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-brand"><span className="min-w-0"><span className="block text-[12px] font-medium text-ink">{item.district}{item.id === activeId && <span className="ml-1.5 text-[10px] font-normal text-brand">Viewing</span>}</span><span className="mt-0.5 block text-[10.5px] text-sub">{formatDate(item.started_at)}</span></span><span className="flex items-center gap-2"><Status value={item.status} /><Eye className="hidden h-3.5 w-3.5 text-sub sm:block" /></span></button>
        <button type="button" disabled={deleting || !canDelete(item)} onClick={() => { setError(""); setPending([item.id]); }} aria-label={`Delete ${item.district} investigation from ${formatDate(item.started_at)}`} title={canDelete(item) ? "Delete from history" : "Wait for this investigation to finish"} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-sub hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>
      </li>)}</ul>
    </> : <div className="mt-4 rounded-lg border border-dashed border-hairline bg-canvas/50 px-4 py-8 text-center"><Clock3 className="mx-auto h-6 w-6 text-sub/50" /><p className="mt-2 text-[12px] font-medium text-ink">No saved investigations</p><p className="mt-1 text-[11px] text-sub">Choose a district above to start your first investigation.</p></div>}
    <AlertDialog.Root open={pending.length > 0} onOpenChange={(open) => { if (!open && !deleting) setPending([]); }}>
      <AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-[70] bg-[#0A2540]/25" /><AlertDialog.Content className="fixed left-1/2 top-1/2 z-[71] w-[420px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-hairline bg-white p-5 shadow-2xl">
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></div>
        <AlertDialog.Title className="text-[16px] font-semibold text-ink">Delete {pending.length === 1 ? "this investigation" : `${pending.length} investigations`}?</AlertDialog.Title>
        <AlertDialog.Description className="mt-2 text-[12px] leading-relaxed text-sub">These saved runs, reports and review notes will move out of history into local trash. Original datasets and shared source files stay untouched. Active runs will be kept.</AlertDialog.Description>
        <div className="mt-5 flex justify-end gap-2"><AlertDialog.Cancel disabled={deleting} className="rounded-md border border-hairline px-3 py-2 text-[12px] font-medium text-ink disabled:opacity-50">Keep investigations</AlertDialog.Cancel><button type="button" disabled={deleting} onClick={remove} className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-[12px] font-medium text-white hover:bg-red-700 disabled:opacity-50">{deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}{deleting ? "Deleting…" : "Delete from history"}</button></div>
      </AlertDialog.Content></AlertDialog.Portal>
    </AlertDialog.Root>
  </section>;
}
