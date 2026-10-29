import React, { useEffect, useState } from "react";
import { AlertCircle, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PRIORITIES, PROGRAMME_NAMES, REQUEST_TYPES, typeLabel } from "@/lib/actionRequests";

const NO_PRESET = {};

const field = "mt-1 w-full rounded-md border border-hairline bg-white px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand";
const labelClass = "block text-[11.5px] font-medium text-ink";

// The analyst's form. It is filled in from the investigation, so the programme team gets the evidence without opening the analyst panel.
export default function RequestDialog({ open, onOpenChange, district, evidence, context, runId, suggestedPriority = "Medium", preset = NO_PRESET, onSubmit }) {
  const [form, setForm] = useState({ type: "verify", programme: PROGRAMME_NAMES[0], priority: "Medium", title: "", ask: "", due: "" });
  const [keep, setKeep] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const type = REQUEST_TYPES.some((item) => item.id === preset.type) ? preset.type : "verify";
    setForm({ type, programme: PROGRAMME_NAMES.includes(preset.programme) ? preset.programme : PROGRAMME_NAMES[0], priority: PRIORITIES.includes(preset.priority) ? preset.priority : suggestedPriority, title: preset.title || `${typeLabel(type)} in ${district}`, ask: preset.ask || "", due: "" });
    setKeep(evidence.map((_, index) => index));
    setError("");
  }, [open, district, evidence, suggestedPriority, preset]);

  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    if (form.title.trim().length < 5) { setError("Give the request a short title."); return; }
    if (form.ask.trim().length < 15) { setError("Say what you need the programme team to do, in a sentence or two."); return; }
    try { onSubmit({ ...form, district, runId, context, evidence: evidence.filter((_, index) => keep.includes(index)) }); onOpenChange(false); }
    catch (failure) { setError(failure.message); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
      <DialogHeader><DialogTitle className="text-[16px]">Ask a programme team to act · {district}</DialogTitle><DialogDescription className="text-[12px]">The programme owner sees this request in the Programme panel and answers it there. You will see their answer here.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-3.5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>What kind of request<select value={form.type} onChange={(event) => setForm((value) => ({ ...value, type: event.target.value, title: value.title === `${typeLabel(value.type)} in ${district}` ? `${typeLabel(event.target.value)} in ${district}` : value.title }))} className={field}>{REQUEST_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><span className="mt-1 block text-[10.5px] font-normal text-sub">{REQUEST_TYPES.find((item) => item.id === form.type)?.hint}</span></label>
          <label className={labelClass}>Programme<select value={form.programme} onChange={set("programme")} className={field}>{PROGRAMME_NAMES.map((name) => <option key={name}>{name}</option>)}</select></label>
        </div>
        <label className={labelClass}>Title<input value={form.title} onChange={set("title")} maxLength={140} className={field} /></label>
        <label className={labelClass}>What should the team do?<textarea value={form.ask} onChange={set("ask")} rows={4} maxLength={1200} placeholder="Say exactly what you need, where, and what you will do with the answer." className={`${field} resize-y`} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>Priority<select value={form.priority} onChange={set("priority")} className={field}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select><span className="mt-1 block text-[10.5px] font-normal text-sub">Suggested from the gap to the national rate.</span></label>
          <label className={labelClass}>Answer wanted by (optional)<input type="date" value={form.due} onChange={set("due")} min={new Date().toISOString().slice(0, 10)} className={field} /></label>
        </div>
        {evidence.length > 0 && <fieldset><legend className={labelClass}>Evidence to include</legend>
          <ul className="mt-1.5 space-y-1 rounded-md bg-canvas/70 p-2.5">{evidence.map((item, index) => <li key={item.label}><label className="flex cursor-pointer items-start gap-2 text-[11.5px]"><input type="checkbox" checked={keep.includes(index)} onChange={() => setKeep((value) => value.includes(index) ? value.filter((entry) => entry !== index) : [...value, index])} className="mt-0.5 accent-[#635BFF]" /><span><span className="font-medium text-ink">{item.label}:</span> <span className="text-sub">{item.value}</span></span></label></li>)}</ul></fieldset>}
        {error && <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-[11.5px] text-red-700"><AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />{error}</p>}
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => onOpenChange(false)} className="rounded-md border border-hairline px-3 py-2 text-[12px] font-medium text-ink hover:bg-canvas">Cancel</button><button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-[12px] font-medium text-white hover:bg-[#524BE0]"><Send className="h-3.5 w-3.5" />Send request</button></div>
        <p className="text-[10.5px] leading-relaxed text-sub">Associations in survey data are not causes. A request asks the programme team to check or act; it does not approve spending.</p>
      </form>
    </DialogContent>
  </Dialog>;
}
