import { createClientFromRequest } from "npm:@base44/sdk";
import { answerChartQuestion, validateChartRequest } from "./groq.mjs";

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  try {
    const base44 = createClientFromRequest(request);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Sign in to ask about this chart." }, { status: 401 });

    const input = validateChartRequest(await request.json());
    const result = await answerChartQuestion(input, Deno.env.get("GROQ_API_KEY"));
    return Response.json(result);
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && (error.status === 401 || error.status === 403)) {
      return Response.json({ error: "Sign in to ask about this chart." }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Could not answer the question.";
    const invalid = message.startsWith("Invalid") || message.startsWith("Enter") || message.startsWith("A chart");
    return Response.json({ error: message }, { status: invalid ? 400 : 503 });
  }
});
