/// <reference types="vite/client" />
import { base44 } from "@/api/base44Client";

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

  const result = await base44.functions.invoke("chart-insight", input);
  const value = result?.data ?? result;
  if (typeof value?.answer !== "string") throw new Error(value?.error || "Could not answer the question.");
  return value.answer;
}
