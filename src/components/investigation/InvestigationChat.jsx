import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUp, Check, ClipboardList, FileText, Link2, Loader2, PanelTop, Paperclip, PlayCircle, RotateCcw, Sparkles, StickyNote, X } from "lucide-react";
import { ACCEPTED_FILES, request, uploadFile } from "@/lib/investigationApi";
import Md from "./Markdown";

export const STARTERS = [
  "Why might poverty be this high here?",
  "Run the same investigation for the district most similar to this one",
  "Show me what lines up with the gap",
  "Save a note that we need local market data before acting",
];
const ICONS = { request_action: ClipboardList, run_investigation: PlayCircle, write_report: FileText, open_view: PanelTop, save_note: StickyNote };

// Answers saved before action blocks were parsed properly still contain the raw JSON; hide it when they are reopened.
function withoutActionJson(text) {
  return String(text)
    .replace(/```(?:actions|json)?[ \t]*\n?[\s\S]*?"type"[\s\S]*?```/gi, "")
    .replace(/\n\s*\[\s*\{\s*"type"[\s\S]*$/, "")
    .trim();
}

function ActionCard({ action, status, onRun, onDismiss }) {
  const Icon = ICONS[action.type] || Sparkles;
  return <div className={`mt-2 flex items-center gap-3 rounded-lg border p-2.5 ${status === "done" ? "border-[#BFE5CF] bg-[#EAF7F0]/60" : "border-hairline bg-canvas/60"}`}>
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white text-brand">{status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "done" ? <Check className="h-3.5 w-3.5 text-[#147D4B]" /> : <Icon className="h-3.5 w-3.5" />}</span>
    <div className="min-w-0 flex-1"><p className="text-[12px] font-medium text-ink">{action.label}</p>{action.type === "save_note" && <p className="mt-0.5 line-clamp-2 text-[11px] text-sub">{action.note}</p>}{action.type === "run_investigation" && status === "pending" && <p className="mt-0.5 text-[10.5px] text-sub">Opens a new run. This one stays in History.</p>}{status === "failed" && <p className="mt-0.5 text-[10.5px] text-red-700">Could not do this. Try again.</p>}</div>
    {(status === "pending" || status === "failed") && <div className="flex shrink-0 items-center gap-1.5"><button type="button" onClick={onRun} className="rounded-md bg-brand px-2.5 py-1.5 text-[11.5px] font-medium text-white hover:bg-[#524BE0]">Do it</button><button type="button" onClick={onDismiss} aria-label="Dismiss" className="grid h-7 w-7 place-items-center rounded-md text-sub hover:bg-white hover:text-ink"><X className="h-3.5 w-3.5" /></button></div>}
    {status === "done" && <span className="text-[11px] font-medium text-[#147D4B]">Done</span>}
  </div>;
}

export default function InvestigationChat({ id, district, delivery, findings, onAction, onSaved, onOpenConnections, onUploaded, fill = false, intro = null, ask = null }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const picker = useRef(null);
  // Files chosen for the next message: read by the server as soon as they are picked, so they also appear under Sources.
  const [files, setFiles] = useState([]);
  const reading = files.some((file) => file.state === "reading");
  const activeId = useRef(id);

  // Saved questions come back after a reload, so the conversation is never lost.
  useEffect(() => {
    activeId.current = id; setMessages([]); setInput(""); setError(""); setSending(false); setFiles([]);
    if (!id) return;
    request(`/chat/${id}`).then((saved) => {
      if (activeId.current !== id || !saved.entries?.length) return;
      setMessages(saved.entries.slice(-12).flatMap((entry) => [{ role: "user", content: entry.question }, { role: "assistant", content: withoutActionJson(entry.answer), unmatched: [], actions: [] }]));
    }).catch(() => {});
  }, [id]);
  useEffect(() => { if (messages.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, sending]);

  const attach = async (list) => {
    setError("");
    const runId = id;
    for (const file of [...list]) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      setFiles((previous) => [...previous, { key, name: file.name, state: "reading" }]);
      try {
        const reply = await uploadFile(runId, file);
        if (activeId.current !== runId) return;
        setFiles((previous) => previous.map((item) => item.key === key ? { ...item, state: "ready", sourceId: reply.added } : item));
        onUploaded?.();
      } catch (failure) {
        if (activeId.current !== runId) return;
        setFiles((previous) => previous.filter((item) => item.key !== key));
        setError(`${file.name}: ${failure.message}`);
      }
    }
  };

  const send = async (text) => {
    const ready = files.filter((file) => file.state === "ready");
    const question = text.trim() || (ready.length ? `Read ${ready.length === 1 ? "the attached file" : "the attached files"}, tell me what it says, and how it relates to ${district}.` : "");
    if (!question || sending || reading) return;
    const next = [...messages, { role: "user", content: question, files: ready.map((file) => file.name) }];
    setMessages(next); setInput(""); setError(""); setSending(true); setFiles([]);
    const runId = id;
    try {
      const reply = await request(`/chat/${runId}`, { method: "POST", body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), attached: ready.map((file) => file.sourceId), delivery, programme_findings: findings }) });
      if (activeId.current === runId) { onSaved?.(); setMessages([...next, { role: "assistant", content: reply.answer, unmatched: reply.unmatched_numbers || [], actions: (reply.actions || []).map((action) => ({ ...action, status: "pending" })) }]); }
    } catch (failure) { if (activeId.current === runId) { setMessages(messages); setInput(text); setFiles(ready); setError(failure.message); } }
    finally { if (activeId.current === runId) setSending(false); }
  };

  // A question chosen elsewhere on the page (a suggestion chip) is sent as if it was typed.
  const lastAsk = useRef(null);
  useEffect(() => {
    if (!ask || lastAsk.current === ask.nonce) return;
    lastAsk.current = ask.nonce;
    send(ask.text);
  });

  const setStatus = (messageIndex, actionIndex, status) => setMessages((previous) => previous.map((message, i) => i !== messageIndex ? message : { ...message, actions: message.actions.map((action, n) => n === actionIndex ? { ...action, status } : action) }));
  const runAction = async (messageIndex, actionIndex) => {
    const { status: _status, label: _label, ...action } = messages[messageIndex].actions[actionIndex];
    setStatus(messageIndex, actionIndex, "running");
    try { await onAction(action); setStatus(messageIndex, actionIndex, "done"); } catch { setStatus(messageIndex, actionIndex, "failed"); }
  };

  const scroller = fill ? "min-h-0 flex-1 overflow-y-auto" : "max-h-[420px] overflow-y-auto";
  return <section aria-label="Ask the AI analyst" className={fill ? "flex h-full min-h-0 flex-col bg-white" : "overflow-hidden rounded-xl border border-hairline bg-white"}>
    {!fill && <header className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-soft text-brand"><Sparkles className="h-3.5 w-3.5" /></span>
      <h2 className="text-[12.5px] font-semibold text-ink">Ask or instruct the AI analyst</h2>
      <span className="hidden text-[11px] text-sub sm:inline">about {district} · answers are saved to the notebook</span>
      {onOpenConnections && <button type="button" onClick={onOpenConnections} className="ml-auto inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-[10.5px] text-sub hover:bg-canvas hover:text-ink"><Link2 className="h-3 w-3 text-brand" />Connected sources</button>}
      {messages.length > 0 && <button type="button" onClick={() => { setMessages([]); setError(""); }} className="ml-3 inline-flex items-center gap-1 text-[11px] text-sub hover:text-ink"><RotateCcw className="h-3 w-3" />New chat</button>}
    </header>}
    {(messages.length > 0 || sending || intro) && <div className={`${scroller} space-y-3 px-4 py-4`} aria-live="polite">
      {intro}
      {messages.map((message, index) => message.role === "user"
        ? <div key={index} className="flex flex-col items-end gap-1.5">{message.files?.length > 0 && <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">{message.files.map((name) => <span key={name} className="inline-flex max-w-[200px] items-center gap-1 rounded-lg border border-hairline bg-white px-2 py-1 text-[11px] text-ink"><Paperclip className="h-3 w-3 shrink-0 text-brand" /><span className="truncate">{name}</span></span>)}</div>}<p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-brand-soft px-3.5 py-2 text-[12.5px] leading-relaxed text-ink">{message.content}</p></div>
        : <div key={index} className="flex gap-2.5"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-canvas text-brand"><Sparkles className="h-3 w-3" /></span><div className="min-w-0 flex-1"><Md>{message.content}</Md>{message.actions?.map((action, n) => action.status === "dismissed" ? null : <ActionCard key={n} action={action} status={action.status} onRun={() => runAction(index, n)} onDismiss={() => setStatus(index, n, "dismissed")} />)}{message.unmatched?.length > 0 && <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[10.5px] text-amber-800">Check these figures against the data: {message.unmatched.join(", ")}. They were not found in the verified calculations.</p>}</div></div>)}
      {sending && <div className="flex items-center gap-2.5 text-[12px] text-sub"><span className="grid h-6 w-6 place-items-center rounded-full bg-canvas text-brand"><Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" /></span><span className="thinking-shimmer">Reading the evidence…</span></div>}
      <div ref={endRef} />
    </div>}
    {error && <p role="alert" className="mx-4 mb-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-[11.5px] text-red-700"><AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />{error}</p>}
    {messages.length === 0 && !sending && !intro && <div className="flex flex-wrap gap-2 px-4 pt-3">{STARTERS.map((text) => <button key={text} type="button" onClick={() => send(text)} className="rounded-full border border-hairline bg-white px-3 py-1.5 text-left text-[11.5px] text-ink hover:border-brand/40 hover:text-brand">{text}</button>)}</div>}
    {files.length > 0 && <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-hairline px-3 pt-2.5">{files.map((file) => <span key={file.key} className="inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border border-hairline bg-canvas/60 py-1 pl-2 pr-1 text-[11px] text-ink">{file.state === "reading" ? <Loader2 className="h-3 w-3 shrink-0 animate-spin text-brand" /> : <Check className="h-3 w-3 shrink-0 text-[#147D4B]" />}<span className="truncate">{file.name}</span><button type="button" onClick={() => setFiles((previous) => previous.filter((item) => item.key !== file.key))} aria-label={`Remove ${file.name}`} className="grid h-4 w-4 place-items-center rounded text-sub hover:bg-white hover:text-ink"><X className="h-3 w-3" /></button></span>)}</div>}
    <form onSubmit={(event) => { event.preventDefault(); send(input); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files.length) attach(event.dataTransfer.files); }} className={`flex shrink-0 items-end gap-2 p-3 ${files.length ? "" : "border-t border-hairline"}`}>
      <input ref={picker} type="file" multiple accept={ACCEPTED_FILES} className="sr-only" aria-label="Attach files" onChange={(event) => { if (event.target.files.length) attach(event.target.files); event.target.value = ""; }} />
      <button type="button" onClick={() => picker.current?.click()} aria-label="Attach images or files" title="Attach images or files" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-hairline bg-white text-sub hover:border-brand/40 hover:text-brand"><Paperclip className="h-4 w-4" /></button>
      <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(input); } }} rows={1} maxLength={1500} aria-label={`Ask about ${district}`} placeholder={`Ask a question or give a task, e.g. "run Huye and compare"`} className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-hairline bg-white px-3 py-2.5 text-[12.5px] text-ink outline-none focus:border-brand/50" />
      <button type="submit" disabled={sending || reading || (!input.trim() && !files.some((file) => file.state === "ready"))} aria-label="Send question" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white hover:bg-[#524BE0] disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
    </form>
    <p className="shrink-0 px-4 pb-3 text-[10px] text-[#8A94A6]">Survey figures are verified. Programme-team findings, web pages and your files are labelled separately. Tasks run only after you press Do it.</p>
  </section>;
}
