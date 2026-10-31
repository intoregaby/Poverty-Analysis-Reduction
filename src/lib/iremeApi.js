import { supabase } from "@/lib/supabaseClient";

const API_BASE = import.meta.env.VITE_IREME_API_URL?.replace(/\/$/, "");

export async function requestGoverned(path, { method = "GET", body, idempotencyKey, responseType = "json" } = {}) {
  if (!API_BASE) {
    throw new Error("The governed Ireme API is not configured. Set VITE_IREME_API_URL to the deployed API address.");
  }
  if (!supabase) {
    throw new Error("Supabase is not configured. Set the public Supabase URL and publishable key, then sign in.");
  }

  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Sign in with an authorized Supabase account to access governed research.");

  const headers = new Headers({ Authorization: `Bearer ${token}`, Accept: responseType === "blob" ? "application/octet-stream" : "application/json" });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error("Could not reach the governed Ireme API. Check its address and that the service is running.");
  }

  if (!response.ok) {
    let detail;
    try { detail = await response.json(); } catch { detail = null; }
    const code = detail?.error_code ? ` (${detail.error_code})` : "";
    const trace = detail?.trace_id ? ` Trace ID: ${detail.trace_id}.` : "";
    throw Object.assign(new Error(`${detail?.message || `Request failed (${response.status})`}${code}.${trace}`), {
      status: response.status,
      code: detail?.error_code,
      traceId: detail?.trace_id,
    });
  }
  if (responseType === "blob") return { blob: await response.blob(), contentType: response.headers.get("Content-Type") };
  return response.json();
}
