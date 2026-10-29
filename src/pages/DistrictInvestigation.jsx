import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowUp, CheckCircle2, Clock3, Link2, Plus, Sparkles } from "lucide-react";
import { DASHBOARD_DISTRICTS, NATIONAL_EICV7 } from "@/data/dashboardEvidence";
import { request } from "@/lib/investigationApi";
import AnalystBrief from "@/components/investigation/AnalystBrief";
import PriorityBoard from "@/components/investigation/PriorityBoard";
import ProblemProfile from "@/components/investigation/ProblemProfile";
import VerificationSection, { VerificationSummary } from "@/components/investigation/VerificationSection";
import { verificationSection } from "@/lib/reportVerification";
import ContextEvidence from "@/components/investigation/ContextEvidence";
import DriverDiagnosis from "@/components/investigation/DriverDiagnosis";
import AccessEvidence from "@/components/investigation/AccessEvidence";
import FinanceTrendEvidence from "@/components/investigation/FinanceTrendEvidence";
import ReliabilityEvidence from "@/components/investigation/ReliabilityEvidence";
import TrendEvidence from "@/components/investigation/TrendEvidence";
import DataUsed from "@/components/investigation/DataUsed";
import InvestigationHistory from "@/components/investigation/InvestigationHistory";
import ThinkingBlock from "@/components/investigation/ThinkingBlock";
import TaskPanel from "@/components/investigation/TaskPanel";
import DistrictDelivery from "@/components/investigation/DistrictDelivery";
import { deliveryForAi } from "@/data/programmeDelivery";
import RequestDialog from "@/components/requests/RequestDialog";
import AnalystRequests from "@/components/requests/AnalystRequests";
import { contextFrom, evidenceFrom, suggestPriority } from "@/components/requests/evidence";
import { actorFrom, findingsForAi, isOpen, useActionRequests } from "@/lib/actionRequests";
import { useDemoAuth } from "@/lib/DemoAuthContext";
import ConnectionsPanel from "@/components/investigation/ConnectionsPanel";
import Notebook from "@/components/investigation/Notebook";
import SidePanel from "@/components/investigation/SidePanel";
import Status from "@/components/investigation/InvestigationStatus";
import { GuideCard, SourcesPane, StudioPane } from "@/components/investigation/WorkspacePanes";
import InvestigationChat from "@/components/investigation/InvestigationChat";
import ReportArtifact, { ReportPanel } from "@/components/investigation/ReportArtifact";
import useAiReport from "@/components/investigation/useAiReport";
import { STAGE_INFO } from "@/components/investigation/stageInfo";
import { ComparisonChart, DataCatalog, EvidenceLimits, FindingsGrid, ResponsesAndReview, SourceConflicts } from "@/components/investigation/EvidenceSections";

const choices = [...DASHBOARD_DISTRICTS].sort((a, b) => a.name.localeCompare(b.name));
const suggestions = [...DASHBOARD_DISTRICTS].sort((a, b) => b.poverty - a.poverty).slice(0, 4).map((item) => item.name);
const DEFAULT_STAGES = Object.keys(STAGE_INFO).map((name) => ({ name, status: "Pending" }));

export default function DistrictInvestigation() {
  const [params, setParams] = useSearchParams();
  const districtParam = params.get("district");
  const [district, setDistrict] = useState(choices.some((item) => item.name === districtParam) ? districtParam : "Gisagara");
  const [id, setId] = useState(params.get("id"));
  const activeId = useRef(id);
  const [state, setState] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [review, setReview] = useState({ decision: "request_data", note: "" });
  const [decisions, setDecisions] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState(null);
  const [view, setView] = useState("chat");
  const [pane, setPane] = useState("chat");
  const [ask, setAsk] = useState(null);
  const [notebookKey, setNotebookKey] = useState(0);
  const [sourcesKey, setSourcesKey] = useState(0);
  const { requests: actionRequests, create: createActionRequest, advance: advanceActionRequest, setInclude } = useActionRequests();
  const { demoUser } = useDemoAuth();
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestPreset, setRequestPreset] = useState(undefined);
  const [sentRequest, setSentRequest] = useState(null);
  const [notebookCount, setNotebookCount] = useState(null);
  const autoStarted = useRef(false);
  const finished = ["Completed", "Warning"].includes(state?.status);
  const ai = useAiReport(id, Boolean(result));

  const loadHistory = useCallback(async () => {
    try { setHistory((await request("/history")).investigations); } catch (failure) { setError(failure.message); }
  }, []);

  const loadState = useCallback(async (runId) => {
    try {
      const data = await request(`/run/${runId}`);
      if (activeId.current !== runId) return;
      setState(data);
      if (["Completed", "Warning"].includes(data.status)) {
        const [findings, notes] = await Promise.all([request(`/result/${runId}`), request(`/review/${runId}`)]);
        if (activeId.current !== runId) return;
        setResult(findings);
        setDecisions(notes.decisions);
        await loadHistory();
      }
    } catch (failure) { if (activeId.current === runId) setError(failure.message); }
  }, [loadHistory]);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => {
    if (!id) return undefined;
    loadState(id);
    if (["Completed", "Warning", "Failed"].includes(state?.status)) return undefined;
    const timer = window.setInterval(() => loadState(id), 1800);
    return () => window.clearInterval(timer);
  }, [id, loadState, state?.status]);
  useEffect(() => {
    if (!id || !state?.data_signature || !["Completed", "Warning"].includes(state?.stages?.[0]?.status)) return;
    let active = true;
    request(`/catalog/${id}?q=${encodeURIComponent(query)}&page=${page}`).then((data) => { if (active && activeId.current === id) setCatalog(data); }).catch((failure) => { if (active && activeId.current === id) setError(failure.message); });
    return () => { active = false; };
  }, [id, state?.data_signature, state?.stages?.[0]?.status, query, page]);

  const reset = () => { setState(null); setResult(null); setCatalog(null); setDecisions([]); setError(""); setView("chat"); setPane("chat"); };
  const start = async (name = district) => {
    activeId.current = null;
    setId(null); setBusy(true); reset(); setPanel(null);
    setDistrict(name);
    try {
      const data = await request("/run", { method: "POST", body: JSON.stringify({ district: name }) });
      activeId.current = data.id;
      setId(data.id);
      setParams({ district: name, id: data.id });
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const resume = async () => {
    setBusy(true); setError("");
    try { await request(`/resume/${id}`, { method: "POST", body: "{}" }); setState((value) => ({ ...value, status: "Running" })); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const saveReview = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await request(`/review/${id}`, { method: "POST", body: JSON.stringify(review) });
      setDecisions(response.decisions); setReview({ ...review, note: "" }); setNotebookKey((value) => value + 1);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  // Tasks the analyst confirms in the chat. The server has already limited these to a fixed set.
  const openView = (key) => { setView(key); setPane("chat"); };
  const runChatAction = async (action) => {
    if (action.type === "run_investigation") { await start(action.district); return; }
    if (action.type === "request_action") { setRequestPreset({ type: action.request_type, programme: action.programme, priority: action.priority, title: action.title, ask: action.ask }); setRequestOpen(true); return; }
    if (action.type === "write_report") { ai.regenerate(); setPanel("report"); return; }
    if (action.type === "open_view") { if (action.tab === "history") setPanel("history"); else openView(action.tab); return; }
    if (action.type === "save_note") {
      const response = await request(`/review/${id}`, { method: "POST", body: JSON.stringify({ decision: action.decision, note: action.note }) });
      setDecisions(response.decisions); setNotebookKey((value) => value + 1);
      return;
    }
    throw new Error("Unknown task");
  };
  const deleteHistory = async (ids) => {
    const response = { deleted: [], skipped: [] };
    for (let offset = 0; offset < ids.length; offset += 200) {
      try {
        const batch = await request("/history", { method: "DELETE", body: JSON.stringify({ ids: ids.slice(offset, offset + 200) }) });
        response.deleted.push(...batch.deleted);
        response.skipped.push(...batch.skipped);
      } catch (failure) {
        response.skipped.push(...ids.slice(offset).map((runId) => ({ id: runId, reason: failure.message })));
        break;
      }
    }
    setHistory((previous) => previous.filter((item) => !response.deleted.includes(item.id)));
    if (response.deleted.includes(activeId.current)) {
      activeId.current = null;
      setId(null); reset(); setPanel(null);
      setParams({ district });
    }
    await loadHistory();
    return response;
  };
  const openRun = (item) => {
    activeId.current = item.id;
    setId(item.id); setDistrict(item.district); reset(); setPanel(null);
    setParams({ district: item.district, id: item.id });
  };
  useEffect(() => {
    if (params.get("autoStart") === "1" && !id && !autoStarted.current) {
      autoStarted.current = true;
      start();
    }
  }, [params, id]);

  // A stopped run keeps its last stage marked Running on disk; show it as stopped.
  const stages = state?.stages?.length ? (state.status === "Failed" ? state.stages.map((stage) => stage.status === "Running" ? { ...stage, status: "Failed" } : stage) : state.stages) : DEFAULT_STAGES;
  const shownDistrict = state?.district || district;
  const historyItems = history.map((item) => item.id === id && state?.status ? { ...item, status: state.status } : item);
  const evidence = useMemo(() => evidenceFrom(result), [result]);
  const requestContext = useMemo(() => contextFrom(result), [result]);
  const districtRequests = actionRequests.filter((item) => item.district === shownDistrict);
  const programmeFindings = useMemo(() => findingsForAi(shownDistrict, actionRequests), [shownDistrict, actionRequests]);
  const openRequests = districtRequests.filter((item) => isOpen(item.status)).length;
  const sendRequest = (input) => {
    const made = createActionRequest(input, actorFrom(demoUser));
    setSentRequest(made.id);
    openView("respond");
  };
  const withdrawRequest = (item) => { try { advanceActionRequest(item.id, { to: "Withdrawn", by: actorFrom(demoUser), note: "Withdrawn by the analyst." }); } catch (failure) { setError(failure.message); } };
  const lead = result?.analyst_brief?.headline || result?.findings?.findings?.[0]?.explanation;

  const topics = (result?.analyst_brief?.observations || []).map((item) => item.title).slice(0, 5);
  const counts = { respond: openRequests, notebook: notebookCount };
  const openStudio = (key) => {
    if (key === "report" || key === "steps") setPanel(panel === key ? null : key);
    else openView(key);
  };
  const goHome = () => { activeId.current = null; setId(null); reset(); setPanel(null); setParams({}); };
  const VIEW_TITLES = { overview: "Findings", drivers: "Drivers", compare: "Comparison", respond: "Requests and review", notebook: "Case notebook", data: "Data and sources" };
  const headerButton = "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-hairline bg-white px-2.5 text-[11.5px] font-medium text-ink hover:bg-canvas";

  const fromNote = params.get("from") === "poverty-support" && (() => {
    const row = DASHBOARD_DISTRICTS.find((item) => item.name === shownDistrict);
    if (!row) return null;
    return <div role="note" aria-label="Figures carried over from Poverty and Social Support" className="rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-[12px] leading-relaxed text-ink">
      <p className="font-medium">Started from Poverty &amp; Social Support: {row.name}</p>
      <p className="mt-0.5 text-sub">Poverty {row.poverty.toFixed(1)}% of people (Rwanda {NATIONAL_EICV7.poverty.toFixed(1)}%). VUP participation {row.vupAmongPoor.toFixed(1)}% of {row.samplePoorHouseholds} surveyed poor households (Rwanda {NATIONAL_EICV7.vupAmongPoor.toFixed(1)}%). EICV7 2023/24. These count different groups, so they cannot be subtracted.</p>
      <Link to="/" className="mt-1 inline-block font-medium text-brand underline underline-offset-2">Back to Poverty Analysis</Link>
    </div>;
  })();
  const errorBanner = error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>;
  const notices = <>
    {state?.status === "Failed" && state.errors?.length > 0 && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-[11.5px] text-red-700">{state.errors.map((item, index) => <p key={index}>{item}</p>)}</div>}
    {state?.counts?.cached_sources_available > 0 && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">{state.counts.cached_sources_available} previously verified official copies are available. Their hashes were rechecked; the latest source update checks failed. See the source register for dates and errors.</p>}
  </>;
  const thinking = <ThinkingBlock district={shownDistrict} state={state} stages={stages} panelOpen={panel === "steps"} onOpenPanel={() => setPanel("steps")} onClosePanel={() => setPanel(null)} />;

  const header = <div className="sticky top-0 z-20 border-b border-hairline bg-white/90 backdrop-blur"><div className={`flex h-[52px] items-center gap-3 px-4 sm:px-6 ${id ? "" : "mx-auto max-w-[1100px] lg:px-8"}`}>
    <Link to="/" className="text-sub hover:text-brand" aria-label="Back to Poverty Analysis"><ArrowLeft className="h-4 w-4" /></Link>
    <div className="flex min-w-0 items-center gap-2"><h1 className="truncate text-[15px] font-semibold text-ink">{id ? shownDistrict : "District Investigation"}</h1>{id && <><span className="hidden whitespace-nowrap text-[12px] text-sub md:inline">District Investigation</span><Status value={state?.status} /></>}</div>
    <div className="ml-auto flex items-center gap-2">
      {id && <button type="button" onClick={goHome} aria-label="New investigation" title="New investigation" className={headerButton}><Plus className="h-3.5 w-3.5 text-brand" /><span className="hidden xl:inline">New investigation</span></button>}
      <button type="button" onClick={() => setPanel(panel === "history" ? null : "history")} aria-label="History" title="History" aria-pressed={panel === "history"} className={headerButton}><Clock3 className="h-3.5 w-3.5 text-brand" aria-hidden /><span className="hidden xl:inline">History</span></button>
      <button type="button" onClick={() => setPanel(panel === "connections" ? null : "connections")} aria-label="Connected websites" title="Connected websites" aria-pressed={panel === "connections"} className={headerButton}><Link2 className="h-3.5 w-3.5 text-brand" aria-hidden /><span className="hidden xl:inline">Connected websites</span></button>
    </div>
  </div></div>;

  const overlays = <>
    {result && <RequestDialog open={requestOpen} onOpenChange={setRequestOpen} district={shownDistrict} evidence={evidence} context={requestContext} runId={id} suggestedPriority={suggestPriority(result)} preset={requestPreset} onSubmit={sendRequest} />}
    {panel === "connections" && <ConnectionsPanel onClose={() => setPanel(null)} />}
    {panel === "history" && <SidePanel title="Investigation history" subtitle={`${historyItems.length} saved`} icon={Clock3} onClose={() => setPanel(null)}><div className="p-4"><InvestigationHistory history={historyItems} activeId={id} onOpen={openRun} onDelete={deleteHistory} /></div></SidePanel>}
    {panel === "steps" && id && <TaskPanel id={id} district={shownDistrict} state={state} stages={stages} busy={busy} onResume={resume} onClose={() => setPanel(null)} />}
    {panel === "report" && result && <ReportPanel ai={ai} result={result} district={shownDistrict} onClose={() => setPanel(null)} />}
  </>;

  // Start screen: choose a district, or go back to an earlier investigation.
  if (!id) return <div className="min-h-screen pb-14">
    {header}
    <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl space-y-4">
      <div className="pb-2 pt-6 text-center sm:pt-12">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand"><Sparkles className="h-6 w-6" /></span>
        <h2 className="mt-4 text-[26px] font-semibold tracking-tight text-ink">Which district should we investigate?</h2>
        <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-sub">Each investigation is a notebook: the AI reads the survey data and your sources, measures what lines up with poverty, and keeps everything you ask in one place.</p>
      </div>
      {fromNote}
      <form data-tour="inv-form" onSubmit={(event) => { event.preventDefault(); start(); }} className="flex flex-wrap items-center gap-2 rounded-2xl border border-hairline bg-white p-2 pl-4 shadow-[0_2px_8px_rgba(10,37,64,0.04)] focus-within:border-brand/40">
        <label htmlFor="investigation-district" className="text-[12px] text-sub">Investigate</label>
        <select id="investigation-district" value={district} onChange={(event) => setDistrict(event.target.value)} className="h-9 min-w-0 flex-1 rounded-md bg-transparent text-[14px] font-medium text-ink outline-none">{choices.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select>
        <button type="submit" disabled={busy} aria-label="Run investigation" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-[12.5px] font-medium text-white hover:bg-[#524BE0] disabled:opacity-60"><ArrowUp className="h-4 w-4" />Run investigation</button>
      </form>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1"><span className="text-[11px] text-sub">Highest poverty rates:</span>{suggestions.map((name) => <button key={name} type="button" disabled={busy} onClick={() => start(name)} className="rounded-full border border-hairline bg-white px-3 py-1 text-[11.5px] text-ink hover:border-brand/40 hover:text-brand disabled:opacity-60">{name}</button>)}</div>
      {errorBanner}
      <PriorityBoard onOpen={start} disabled={busy} />
      <div className="pt-4"><InvestigationHistory history={historyItems} activeId={id} onOpen={openRun} onDelete={deleteHistory} /></div>
    </div></main>
    {overlays}
  </div>;

  const viewBody = result && <>
    {view === "overview" && <><AnalystBrief brief={result.analyst_brief} /><VerificationSummary section={verificationSection(result)} /><details className="rounded-lg border border-hairline bg-white p-3 text-[12px]"><summary className="cursor-pointer font-medium text-ink">See each checked figure and its source</summary><div className="mt-3"><VerificationSection section={verificationSection(result)} /></div></details><ProblemProfile profile={result.problem_profile} /><DistrictDelivery district={shownDistrict} requests={actionRequests} onOpenRequests={() => openView("respond")} /><FindingsGrid result={result} /><DataUsed dataUsed={result.data_used} /></>}
    {view === "drivers" && (result.drivers && result.diagnosis ? <div className="space-y-4"><DriverDiagnosis drivers={result.drivers} diagnosis={result.diagnosis} /><AccessEvidence access={result.drivers.financial_access} trend={result.drivers.financial_trend} /><FinanceTrendEvidence trend={result.drivers.financial_trend} /></div> : <p className="rounded-xl border border-dashed border-hairline bg-white p-6 text-center text-[12px] text-sub">This saved run predates the driver analysis. Start a new run to include it.</p>)}
    {view === "compare" && <><ComparisonChart result={result} /><TrendEvidence trends={result.drivers?.poverty_trends} /><ReliabilityEvidence reliability={result.reliability} /><ContextEvidence context={result.contextual_analysis} /><SourceConflicts result={result} /></>}
    {view === "respond" && <>
      {sentRequest && <p role="status" className="flex items-start gap-2 rounded-lg border border-[#ABEFC6] bg-[#ECFDF3] p-3 text-[12px] text-[#067647]"><CheckCircle2 className="mt-px h-4 w-4 shrink-0" />Request {sentRequest} was sent. The programme owner will see it in the Programme panel, and their answer will appear below.</p>}
      <AnalystRequests district={shownDistrict} requests={actionRequests} onNew={() => { setRequestPreset(undefined); setRequestOpen(true); }} onWithdraw={withdrawRequest} onToggleAi={setInclude} />
      <ResponsesAndReview id={id} result={result} review={review} setReview={setReview} decisions={decisions} busy={busy} onSave={saveReview} />
    </>}
    {view === "notebook" && <Notebook id={id} district={shownDistrict} findings={programmeFindings} refreshKey={notebookKey} onCount={setNotebookCount} hideSources />}
    {view === "data" && <><EvidenceLimits result={result} /><DataCatalog catalog={catalog} query={query} setQuery={setQuery} page={page} setPage={setPage} /></>}
  </>;

  const paneClass = (name) => `${pane === name ? "flex" : "hidden"} min-h-0 flex-col xl:flex`;

  return <div className="min-h-screen">
    {header}
    <div className="flex h-[calc(100dvh-53px)] flex-col xl:grid xl:grid-cols-[260px_minmax(0,1fr)_280px]">
      <div role="tablist" data-tour="inv-tabs" aria-label="Notebook sections" className="flex shrink-0 border-b border-hairline bg-white xl:hidden">{[["sources", "Sources"], ["chat", "Chat"], ["studio", "Studio"]].map(([key, label]) => <button key={key} role="tab" aria-selected={pane === key} onClick={() => setPane(key)} className={`flex-1 border-b-2 py-2.5 text-[12.5px] font-medium ${pane === key ? "border-brand text-brand" : "border-transparent text-sub"}`}>{label}</button>)}</div>

      <aside aria-label="Sources" className={`${paneClass("sources")} overflow-y-auto border-r border-hairline bg-white`}>
        <SourcesPane id={id} refreshKey={sourcesKey} ready={Boolean(result)} drawerOpen={panel === "connections"} onChanged={() => setNotebookKey((value) => value + 1)} onOpenView={openView} onOpenConnections={() => setPanel("connections")} />
      </aside>

      <section aria-label="Investigation" className={`${paneClass("chat")} bg-white`}>
        {view !== "chat" && result
          ? <div className="min-h-0 flex-1 overflow-y-auto bg-canvas/40">
              <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-hairline bg-white/95 px-4 py-2.5 backdrop-blur"><button type="button" onClick={() => setView("chat")} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-brand hover:bg-brand-soft"><ArrowLeft className="h-3.5 w-3.5" />Chat</button><span className="text-sub">/</span><h2 className="text-[13px] font-semibold text-ink">{VIEW_TITLES[view]}</h2></div>
              <div className="mx-auto max-w-3xl space-y-4 p-4">{errorBanner}{viewBody}</div>
            </div>
          : finished && result
            ? <InvestigationChat fill id={id} district={shownDistrict} delivery={deliveryForAi(shownDistrict, actionRequests)} findings={programmeFindings} onAction={runChatAction} onSaved={() => setNotebookKey((value) => value + 1)} onUploaded={() => { setSourcesKey((value) => value + 1); setNotebookKey((value) => value + 1); }} ask={ask}
                intro={<>{errorBanner}{fromNote}{thinking}{notices}<GuideCard district={shownDistrict} lead={lead} topics={topics} onAsk={(text) => setAsk({ text, nonce: Date.now() })} /><ReportArtifact ai={ai} district={shownDistrict} active={panel === "report"} onOpen={() => setPanel(panel === "report" ? null : "report")} /></>} />
            : <div className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto max-w-3xl space-y-4 p-4">
                {errorBanner}{fromNote}
                <div className="flex justify-end"><p className="max-w-[80%] rounded-2xl rounded-tr-md bg-brand-soft px-4 py-2.5 text-[13px] text-ink">Investigate poverty in <strong>{shownDistrict}</strong></p></div>
                {thinking}{notices}
              </div></div>}
      </section>

      <aside aria-label="Studio" className={`${paneClass("studio")} overflow-y-auto border-l border-hairline bg-white`}>
        <StudioPane ready={Boolean(result)} view={view} counts={counts} onOpen={openStudio} />
      </aside>
    </div>
    {overlays}
  </div>;
}
