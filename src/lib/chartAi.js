/// <reference types="vite/client" />
import { supabase } from "@/lib/supabaseClient";

export async function askChartQuestion(input) {
  if (import.meta.env.DEV) {
    const response = await fetch("/__local/chart-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not answer the question.");
    return result.answer;
  }

  if (!supabase) throw new Error("Chart AI is not configured.");
  const { data, error } = await supabase.functions.invoke("chart-insight", { body: input });
  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    throw new Error(body?.error || "Could not answer the question.");
  }
  if (typeof data?.answer !== "string") throw new Error(data?.error || "Could not answer the question.");
  return data.answer;
}
