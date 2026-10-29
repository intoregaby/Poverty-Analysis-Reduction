import { createClient } from "npm:@supabase/supabase-js@2";
import { answerChartQuestion, validateChartRequest } from "./groq.mjs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: cors });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    });
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) return reply({ error: "Sign in to ask about this chart." }, 401);

    const input = validateChartRequest(await request.json());
    return reply(await answerChartQuestion(input, Deno.env.get("GROQ_API_KEY")));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not answer the question.";
    const invalid = message.startsWith("Invalid") || message.startsWith("Enter") || message.startsWith("A chart");
    return reply({ error: message }, invalid ? 400 : 503);
  }
});
