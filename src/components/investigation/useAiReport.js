import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "@/lib/investigationApi";

// Loads the saved AI report for a finished run. It never asks the AI provider to write one on its own:
// opening a run must not send figures anywhere. Writing happens only when the analyst asks (regenerate).
export default function useAiReport(id, ready) {
  const [state, setState] = useState({ status: "idle", data: null, error: "" });
  const current = useRef(null);

  const write = useCallback(async (runId) => {
    setState({ status: "writing", data: null, error: "" });
    try {
      const data = await request(`/ai-report/${runId}`, { method: "POST", body: "{}" });
      if (current.current === runId) setState({ status: "ready", data, error: "" });
    } catch (failure) { if (current.current === runId) setState({ status: "error", data: null, error: failure.message }); }
  }, []);

  useEffect(() => {
    current.current = ready ? id : null;
    if (!id || !ready) { setState({ status: "idle", data: null, error: "" }); return; }
    setState({ status: "writing", data: null, error: "" });
    request(`/ai-report/${id}`)
      .then((data) => { if (current.current === id) setState({ status: "ready", data, error: "" }); })
      .catch((failure) => { if (current.current !== id) return; if (failure.status === 404) setState({ status: "none", data: null, error: "" }); else setState({ status: "error", data: null, error: failure.message }); });
  }, [id, ready, write]);

  return { ...state, regenerate: () => id && write(id) };
}
