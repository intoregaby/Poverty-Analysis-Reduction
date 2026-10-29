// Supabase edge function: the USSD endpoint. It only translates between the network and src/ussd/core.js
// (copied next to this file by tools/ussd/build-function.mjs) and reads the same tables the web panels use.
//
//   POST (JSON)  { sessionRef, phone, input }              -> demo simulator, restricted to demo members
//   POST (form)  sessionId, phoneNumber, text (Africa's Talking, to be confirmed) -> needs the USSD_GATEWAY_SECRET
//
// A USSD caller is a Program Member, so every query below is limited to that one member's own rows, which is
// what row level security allows a member to read in the web app.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createUssd, makeTranslate } from "./core.js";
import { AfricasTalkingGateway, SimulatorGateway } from "./gateway.js";
import { formatDate, formatDateTime, formatMoney } from "./format.js";
import en from "./en.json" with { type: "json" };
import rw from "./rw.json" with { type: "json" };

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const translate = makeTranslate({ en, rw });
const fmt = { money: formatMoney, date: formatDate, dateTime: formatDateTime };
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-ussd-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const ok = <T,>({ data, error }: { data: T; error: { message: string } | null }): T => { if (error) throw new Error(error.message); return data; };

function storeFor(source: string) {
  return {
    isBlocked: async (phone: string) => Boolean(ok(await db.from("ussd_blocked_numbers").select("phone").eq("phone", phone).maybeSingle())),
    recentRequests: async (phone: string, since: string) => {
      const { count, error } = await db.from("ussd_events").select("id", { count: "exact", head: true }).eq("phone", phone).gte("at", since);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    findMember: async (phone: string) => {
      const row = ok(await db.from("members").select("id, full_name, language, is_demo").eq("phone", phone).maybeSingle());
      if (!row) return null;
      if (source === "simulator" && !row.is_demo) return null; // the open simulator never serves real people
      return { id: row.id, name: String(row.full_name).split(" ")[0], language: row.language };
    },
    getSession: async (ref: string) => {
      const row = ok(await db.from("ussd_sessions").select("*").eq("session_ref", ref).maybeSingle());
      return row && { id: row.id, ref: row.session_ref, phone: row.phone, memberId: row.member_id, language: row.language, path: row.path, screen: row.screen, status: row.status, lastSeen: row.last_seen_at, source: row.source };
    },
    saveSession: async (s: Record<string, unknown>) => {
      const row = { session_ref: s.ref, phone: s.phone, member_id: s.memberId, language: s.language, path: s.path, screen: s.screen, status: s.status, last_seen_at: s.lastSeen, source: s.source };
      const saved = ok(await db.from("ussd_sessions").upsert(row, { onConflict: "session_ref" }).select("*").single());
      return { ...s, id: saved.id };
    },
    logEvent: async (e: Record<string, unknown>) => { ok(await db.from("ussd_events").insert({ session_id: e.sessionId ?? null, phone: e.phone, input: e.input, screen: e.screen, is_error: e.isError, error: e.error ?? null })); },
    insurance: async (memberId: string) => {
      const row = ok(await db.from("insurance_status").select("amount_due, amount_paid, period_end").eq("member_id", memberId).order("period_start", { ascending: false }).limit(1).maybeSingle());
      return row && { due: row.amount_due, paid: row.amount_paid, periodEnd: row.period_end };
    },
    nextVisit: async (memberId: string) => {
      const row = ok(await db.from("visits").select("scheduled_at, purpose").eq("member_id", memberId).eq("status", "Scheduled").gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(1).maybeSingle());
      return row && { scheduledAt: row.scheduled_at, purpose: row.purpose };
    },
    agent: async (memberId: string) => {
      const row = ok(await db.from("agent_assignments").select("agents(full_name, phone)").eq("member_id", memberId).eq("is_current", true).maybeSingle());
      return row?.agents && { name: row.agents.full_name, phone: row.agents.phone };
    },
    voting: async (memberId: string) => {
      const coops = ok(await db.from("cooperative_memberships").select("cooperative_id").eq("member_id", memberId));
      if (!coops.length) return null;
      const all = ok(await db.from("elections").select("id, title, venue, starts_at, ends_at").in("cooperative_id", coops.map((c: { cooperative_id: string }) => c.cooperative_id)));
      // Show the election that matters most: one that is open now, else the next to open, else the latest that closed.
      const nowMs = Date.now();
      const rank = (e: { starts_at: string; ends_at: string }) => (nowMs >= Date.parse(e.starts_at) && nowMs <= Date.parse(e.ends_at) ? 0 : nowMs < Date.parse(e.starts_at) ? 1 : 2);
      const election = [...all].sort((a, b) => rank(a) - rank(b) || (rank(a) === 2 ? Date.parse(b.ends_at) - Date.parse(a.ends_at) : Date.parse(a.starts_at) - Date.parse(b.starts_at)))[0];
      if (!election) return null;
      const vote = ok(await db.from("votes").select("election_id").eq("election_id", election.id).eq("voter_id", memberId).maybeSingle());
      return { title: election.title, venue: election.venue, startsAt: election.starts_at, endsAt: election.ends_at, voted: Boolean(vote) };
    },
    setLanguage: async (memberId: string, language: string) => {
      ok(await db.from("members").update({ language }).eq("id", memberId));
      ok(await db.from("profiles").update({ language }).eq("member_id", memberId));
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const isJson = (req.headers.get("content-type") || "").includes("json");
  const gateway = isJson ? SimulatorGateway : AfricasTalkingGateway;
  if (!isJson) {
    const secret = Deno.env.get("USSD_GATEWAY_SECRET");
    if (!secret) return new Response("END The gateway is not configured yet.", { status: 403, headers: CORS });
    if (req.headers.get("x-ussd-secret") !== secret && new URL(req.url).searchParams.get("secret") !== secret) return new Response("Forbidden", { status: 403, headers: CORS });
  }

  const raw = isJson ? await req.json().catch(() => ({})) : Object.fromEntries(await req.formData().catch(() => new FormData()));
  const request = gateway.parse(raw);
  if (!request.sessionRef || !request.phone) return new Response(JSON.stringify({ text: "Bad request", end: true }), { status: 400, headers: { ...CORS, "content-type": "application/json" } });

  const ussd = createUssd({ store: storeFor(request.source), translate, fmt });
  const reply = await ussd.handle(request);
  const out = gateway.format(reply);
  return "json" in out
    ? new Response(JSON.stringify(out.json), { headers: { ...CORS, "content-type": "application/json" } })
    : new Response(out.text, { headers: { ...CORS, "content-type": "text/plain; charset=utf-8" } });
});
