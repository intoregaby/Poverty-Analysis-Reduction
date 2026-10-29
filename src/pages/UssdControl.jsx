import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CircleStop, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/analyst/Card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabaseClient";
import { formatDateTime, formatNumber } from "@/lib/format";

// Admin control for USSD. Every number is masked by the database before it reaches this page, and every action is
// a database function that checks the caller is an administrator and writes the audit log itself.
const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const REFRESH = 10_000;
const TONE = { active: "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]", ended: "border-hairline bg-canvas text-sub", timed_out: "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]", blocked: "border-[#FEE4E2] bg-[#FEF3F2] text-[#B42318]", error: "border-[#FEE4E2] bg-[#FEF3F2] text-[#B42318]" };

function useUssd() {
  const stats = useQuery({ queryKey: ["ussd-stats"], refetchInterval: REFRESH, queryFn: async () => unwrap(await supabase.rpc("admin_ussd_stats")) });
  const sessions = useQuery({ queryKey: ["ussd-sessions"], refetchInterval: REFRESH, queryFn: async () => unwrap(await supabase.rpc("admin_ussd_sessions", { p_limit: 100 })) });
  const blocked = useQuery({ queryKey: ["ussd-blocked"], refetchInterval: REFRESH, queryFn: async () => unwrap(await supabase.rpc("admin_ussd_blocked")) });
  const audit = useQuery({ queryKey: ["ussd-audit"], refetchInterval: REFRESH, queryFn: async () => unwrap(await supabase.from("admin_audit_log").select("id, action, target, detail, at").like("action", "ussd.%").order("at", { ascending: false }).limit(15)) });
  return { stats, sessions, blocked, audit };
}

export default function UssdControl() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage;
  const client = useQueryClient();
  const { stats, sessions, blocked, audit } = useUssd();
  const [toBlock, setToBlock] = useState(null);
  const [reason, setReason] = useState("");
  const refresh = () => ["ussd-stats", "ussd-sessions", "ussd-blocked", "ussd-audit"].forEach((key) => client.invalidateQueries({ queryKey: [key] }));
  const act = useMutation({ mutationFn: async ({ fn, args }) => unwrap(await supabase.rpc(fn, args)), onSuccess: refresh });
  const failed = stats.error || sessions.error;
  const s = stats.data;

  const tile = (label, value, warn) => <div className="rounded-xl border border-hairline bg-white px-4 py-3"><p className="text-[11.5px] text-sub">{label}</p><p className={`mt-1 text-[22px] font-semibold tabular-nums ${warn && value > 0 ? "text-[#B42318]" : "text-ink"}`}>{formatNumber(value ?? 0, language)}</p></div>;
  const bars = (data) => { const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]); const max = Math.max(1, ...entries.map(([, n]) => n)); return entries.length === 0 ? <p className="text-[12px] text-sub">{t("ussdAdmin.noData")}</p> : <ul className="space-y-1.5">{entries.map(([name, n]) => <li key={name} className="text-[12px]"><div className="flex justify-between"><span className="text-ink">{name}</span><span className="tabular-nums text-sub">{n}</span></div><div className="h-1.5 rounded bg-canvas"><div className="h-1.5 rounded bg-brand" style={{ width: `${(n / max) * 100}%` }} /></div></li>)}</ul>; };

  return (
    <div className="pb-14">
      <PageHeader title={t("ussdAdmin.title")} />
      <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {failed && <p role="alert" className="rounded-lg border border-[#FEDF89] bg-[#FFFAEB] px-4 py-3 text-[12.5px] text-[#B54708]">{t("ussdAdmin.needAdmin")}</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-tour="ussd-stats">
          {tile(t("ussdAdmin.stats.total"), s?.total)}{tile(t("ussdAdmin.stats.today"), s?.today)}{tile(t("ussdAdmin.stats.active"), s?.active)}
          {tile(t("ussdAdmin.stats.timedOut"), s?.timed_out)}{tile(t("ussdAdmin.stats.errors"), s?.errors, true)}{tile(t("ussdAdmin.stats.blocked"), s?.blocked)}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title={t("ussdAdmin.byLanguage")}>{bars(s?.by_language)}</Card>
          <Card title={t("ussdAdmin.byScreen")} subtitle={t("ussdAdmin.byScreenHelp")}>{bars(s?.by_screen)}</Card>
          <Card title={t("ussdAdmin.recentErrors")} tour="ussd-errors">
            {(s?.recent_errors || []).length === 0 ? <p className="text-[12px] text-sub">{t("ussdAdmin.noErrors")}</p> : <ul className="space-y-2 text-[12px]">{s.recent_errors.map((item, index) => <li key={index}><span className="text-[#B42318]">{item.error}</span><span className="block text-[10.5px] text-sub">{item.phone} · {formatDateTime(item.at, language)}</span></li>)}</ul>}
          </Card>
        </div>

        <Card title={t("ussdAdmin.sessions")} subtitle={t("ussdAdmin.sessionsHelp")} bodyClassName="px-0 pb-0" tour="ussd-sessions">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[12.5px]">
              <thead><tr className="border-y border-hairline bg-[#FAFBFD] text-[10.5px] uppercase tracking-[0.06em] text-[#8A94A6]">{["phone", "member", "language", "path", "status", "source", "lastSeen", ""].map((key) => <th key={key} className="px-4 py-2 text-left font-medium">{key && t(`ussdAdmin.col.${key}`)}</th>)}</tr></thead>
              <tbody>
                {(sessions.data || []).map((row) => (
                  <tr key={row.id} className="border-b border-hairline/70 last:border-0">
                    <td className="px-4 py-2 font-mono text-[12px] text-ink">{row.phone_masked}</td>
                    <td className="px-4 py-2 text-ink">{row.member_name || "—"}</td>
                    <td className="px-4 py-2 uppercase text-sub">{row.language}</td>
                    <td className="px-4 py-2 text-sub">{row.path.join(" › ")}{row.errors > 0 && <span className="ml-2 text-[#B42318]">({row.errors} {t("ussdAdmin.errorsShort")})</span>}</td>
                    <td className="px-4 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${TONE[row.status]}`}>{t(`ussdAdmin.status.${row.status}`)}</span></td>
                    <td className="px-4 py-2 text-sub">{row.source}</td>
                    <td className="px-4 py-2 text-sub">{formatDateTime(row.last_seen_at, language)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-1.5">
                        {row.status === "active" && <button type="button" onClick={() => act.mutate({ fn: "admin_end_ussd_session", args: { p_session: row.id } })} className="inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-[11px] font-medium text-ink hover:bg-canvas"><CircleStop className="h-3 w-3" aria-hidden="true" />{t("ussdAdmin.end")}</button>}
                        <button type="button" onClick={() => { setReason(""); setToBlock(row); }} className="inline-flex items-center gap-1 rounded-md border border-[#FECDCA] px-2 py-1 text-[11px] font-medium text-[#B42318] hover:bg-[#FEF3F2]"><Ban className="h-3 w-3" aria-hidden="true" />{t("ussdAdmin.block")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sessions.data?.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-[12px] text-sub">{t("ussdAdmin.noSessions")}</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title={t("ussdAdmin.blockedTitle")} tour="ussd-blocked">
            {(blocked.data || []).length === 0 ? <p className="text-[12px] text-sub">{t("ussdAdmin.noBlocked")}</p> : <ul className="divide-y divide-hairline/70">{blocked.data.map((row) => <li key={row.ref} className="flex items-center justify-between gap-2 py-2 text-[12.5px]"><span><span className="font-mono text-ink">{row.phone_masked}</span><span className="block text-[11px] text-sub">{row.reason || "—"}</span></span><button type="button" onClick={() => act.mutate({ fn: "admin_unblock_ussd_ref", args: { p_ref: row.ref } })} className="rounded-md border border-hairline px-2 py-1 text-[11px] font-medium text-ink hover:bg-canvas">{t("ussdAdmin.unblock")}</button></li>)}</ul>}
          </Card>
          <Card title={t("ussdAdmin.auditTitle")} subtitle={t("ussdAdmin.auditHelp")} tour="ussd-audit">
            {(audit.data || []).length === 0 ? <p className="text-[12px] text-sub">{t("ussdAdmin.noAudit")}</p> : <ul className="space-y-2 text-[12px]">{audit.data.map((row) => <li key={row.id} className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" /><span><span className="font-medium text-ink">{t(`ussdAdmin.actions.${row.action.replace("ussd.", "")}`, { defaultValue: row.action })}</span> <span className="font-mono text-sub">{row.target}</span><span className="block text-[10.5px] text-sub">{formatDateTime(row.at, language)}</span></span></li>)}</ul>}
          </Card>
        </div>
      </div>

      <AlertDialog open={Boolean(toBlock)} onOpenChange={(open) => { if (!open) setToBlock(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ussdAdmin.blockTitle", { phone: toBlock?.phone_masked })}</AlertDialogTitle>
            <AlertDialogDescription>{t("ussdAdmin.blockText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={120} placeholder={t("ussdAdmin.reason")} aria-label={t("ussdAdmin.reason")} className="w-full rounded-md border border-hairline px-3 py-2 text-[13px] outline-none focus:border-brand" />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => act.mutate({ fn: "admin_block_ussd_session_number", args: { p_session: toBlock.id, p_reason: reason.trim() || null } })}>{t("ussdAdmin.block")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
