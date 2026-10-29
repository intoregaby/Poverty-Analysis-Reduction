// USSD menus and sessions, with no knowledge of any telecom, database or web framework.
// A gateway (the demo simulator, Africa's Talking or another operator) turns its own request into
// { sessionRef, phone, input } and shows the { text, end } that comes back. Everything else is injected:
//   store      reads and writes sessions and member data (see the contract below)
//   translate  (language, key, values) -> text, shared with the web app's translation files
//   fmt        { money, date, dateTime } formatters (the same ones the web app uses)
// Plain ES module on purpose: it runs unchanged in the browser tests, Node and the Supabase edge runtime (Deno).

export const SESSION_TIMEOUT_MS = 90_000;
export const MAX_TEXT = 182; // the usual single-screen limit on USSD networks
const RATE_LIMIT = { count: 30, windowMs: 60_000 };
const LANGUAGES = ["en", "rw"];

/*
store contract (all async):
  isBlocked(phone) -> boolean
  recentRequests(phone, sinceIso) -> number
  findMember(phone) -> { id, name, language } | null
  getSession(ref) -> session | null          session: { id, ref, phone, memberId, language, path[], screen, status, lastSeen (ISO), source }
  saveSession(session) -> session (with id)
  logEvent({ sessionId, phone, input, screen, isError, error })
  insurance(memberId) -> { due, paid, periodEnd } | null
  nextVisit(memberId) -> { scheduledAt, purpose } | null
  agent(memberId) -> { name, phone } | null
  voting(memberId) -> { title, venue, startsAt, endsAt, voted } | null
  setLanguage(memberId, language)
*/

const clip = (text) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text);

export function createUssd({ store, translate, fmt, now = () => new Date(), timeoutMs = SESSION_TIMEOUT_MS }) {
  const say = (language, key, values) => translate(language, key, values);
  const end = (language, key, values) => ({ text: clip(say(language, key, values)), end: true });
  const more = (text) => ({ text: clip(text), end: false });

  const menu = (language, name, note) => more(`${note ? `${note}\n` : ""}${say(language, "ussd.menu", { name })}`);
  const result = (language, text) => more(`${text}\n${say(language, "ussd.back")}`);

  async function render(screen, session, member) {
    const language = session.language;
    const memberId = session.memberId;
    if (screen === "insurance") {
      const row = await store.insurance(memberId);
      if (!row) return result(language, say(language, "ussd.insuranceNone"));
      const balance = Math.max(0, row.due - row.paid);
      const status = balance === 0 ? "paid" : row.paid > 0 ? "partial" : "unpaid";
      return result(language, say(language, "ussd.insurance", { status: say(language, `ussd.status.${status}`), due: fmt.money(balance, language), paid: fmt.money(row.paid, language), date: fmt.date(row.periodEnd, language) }));
    }
    if (screen === "visit") {
      const visit = await store.nextVisit(memberId);
      return result(language, visit ? say(language, "ussd.visit", { when: fmt.dateTime(visit.scheduledAt, language), purpose: visit.purpose }) : say(language, "ussd.visitNone"));
    }
    if (screen === "agent") {
      const agent = await store.agent(memberId);
      return result(language, agent ? say(language, "ussd.agent", { name: agent.name, phone: agent.phone || "—" }) : say(language, "ussd.agentNone"));
    }
    if (screen === "voting") {
      const info = await store.voting(memberId);
      if (!info) return result(language, say(language, "ussd.votingNone"));
      const at = now();
      const state = at < new Date(info.startsAt) ? "upcoming" : at > new Date(info.endsAt) ? "closed" : "open";
      return result(language, say(language, "ussd.voting", { title: info.title, venue: info.venue, from: fmt.date(info.startsAt, language), to: fmt.date(info.endsAt, language), state: say(language, `ussd.state.${state}`), voted: say(language, info.voted ? "ussd.voted" : "ussd.notVoted") }));
    }
    if (screen === "language") return more(say(language, "ussd.language"));
    return menu(language, member.name);
  }

  // One request in, one screen out. Never throws: a failure becomes a logged error and a polite END.
  async function handle({ sessionRef, phone, input = "", source = "gateway" }) {
    let session = null;
    let language = "en";
    try {
      const at = now();
      if (await store.isBlocked(phone)) { await store.logEvent({ phone, input, screen: "blocked", isError: false }); return end(language, "ussd.blocked"); }
      if ((await store.recentRequests(phone, new Date(at.getTime() - RATE_LIMIT.windowMs).toISOString())) >= RATE_LIMIT.count) return end(language, "ussd.tooMany");

      const member = await store.findMember(phone);
      if (!member) { await store.logEvent({ phone, input, screen: "unregistered", isError: false }); return end(language, "ussd.notRegistered"); }
      language = member.language;

      session = await store.getSession(sessionRef);
      if (session && session.status !== "active") return end(session.language || language, "ussd.expired");
      if (session && at.getTime() - new Date(session.lastSeen).getTime() > timeoutMs) {
        await store.saveSession({ ...session, status: "timed_out" });
        await store.logEvent({ sessionId: session.id, phone, input, screen: "timeout", isError: false });
        return end(session.language, "ussd.expired");
      }

      if (!session) {
        session = await store.saveSession({ ref: sessionRef, phone, memberId: member.id, language, path: ["menu"], screen: "menu", status: "active", lastSeen: at.toISOString(), source });
        await store.logEvent({ sessionId: session.id, phone, input, screen: "menu", isError: false });
        return menu(language, member.name);
      }

      language = session.language;
      const choice = String(input).trim();
      let screen = session.screen;
      let reply;
      let note = "";

      if (screen === "menu") {
        const next = { 1: "insurance", 2: "visit", 3: "agent", 4: "voting", 5: "language" }[choice];
        if (choice === "0") {
          await store.saveSession({ ...session, status: "ended", lastSeen: at.toISOString() });
          await store.logEvent({ sessionId: session.id, phone, input, screen: "exit", isError: false });
          return end(language, "ussd.bye");
        }
        if (next) { screen = next; reply = await render(next, session, member); } else { note = say(language, "ussd.invalid"); reply = menu(language, member.name, note); }
      } else if (screen === "language") {
        const picked = { 1: "en", 2: "rw" }[choice];
        if (picked && LANGUAGES.includes(picked)) {
          language = picked;
          session = { ...session, language };
          await store.setLanguage(member.id, picked);
          screen = "menu";
          reply = menu(language, member.name, say(language, "ussd.languageSaved"));
        } else reply = more(`${say(language, "ussd.invalid")}\n${say(language, "ussd.language")}`);
      } else if (choice === "0") {
        screen = "menu";
        reply = menu(language, member.name);
      } else reply = await render(screen, session, member); // any other key on a result screen shows it again

      const path = screen === session.screen ? session.path : [...session.path, screen];
      await store.saveSession({ ...session, language, screen, path, lastSeen: at.toISOString() });
      await store.logEvent({ sessionId: session.id, phone, input, screen, isError: false });
      return reply;
    } catch (error) {
      try {
        if (session) await store.saveSession({ ...session, status: "error", lastSeen: now().toISOString() });
        await store.logEvent({ sessionId: session?.id, phone, input, screen: "error", isError: true, error: String(error?.message || error).slice(0, 300) });
      } catch { /* logging must never break the reply */ }
      return end(language, "ussd.error");
    }
  }

  return { handle };
}

// Translation lookup shared by every gateway. An empty or missing value in `language` falls back to English.
export function makeTranslate(resources) {
  const lookup = (tree, key) => key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), tree);
  return (language, key, values = {}) => {
    const text = lookup(resources[language], key) || lookup(resources.en, key) || key;
    return text.replace(/{{\s*(\w+)\s*}}/g, (_, name) => (values[name] ?? ""));
  };
}
