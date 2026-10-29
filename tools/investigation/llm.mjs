// One place that talks to hosted models. Providers are tried in order, so a rate limit
// on one does not stop the report or the chat.
const GROQ = { name: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", model: "openai/gpt-oss-120b", reasoning: true, vision: "qwen/qwen3.8-27b" };
const NVIDIA = { name: "NVIDIA", url: "https://integrate.api.nvidia.com/v1/chat/completions", model: "nvidia/nemotron-3-ultra-550b-a55b", reasoning: false, extra: { chat_template_kwargs: { enable_thinking: false } }, vision: "meta/llama-3.2-11b-vision-instruct" };

// Keys are matched to a service by their prefix, because they are easy to paste under the wrong name.
// Identical keys are used once.
export function buildProviders({ groqKey = "", nvidiaKey = "" } = {}) {
  const seen = new Set();
  const providers = [];
  for (const key of [groqKey, nvidiaKey].map((value) => (value || "").trim()).filter(Boolean)) {
    if (seen.has(key)) continue;
    seen.add(key);
    providers.push({ ...(key.startsWith("nvapi-") ? NVIDIA : GROQ), key });
  }
  return providers;
}

function lenientJson(content) {
  try { return JSON.parse(content); } catch { /* fall through to the outermost object */ }
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The AI returned an unreadable answer. Try again.");
  const body = content.slice(start, end + 1);
  try { return JSON.parse(body); } catch { /* try the common missing-comma repair */ }
  // Some models drop the comma between array items or fields; raw newlines never occur inside valid JSON strings.
  const repaired = body.replace(/}\s*{/g, "},{").replace(/]\s*"/g, '],"').replace(/}\s*"/g, '},"').replace(/"\s*\n\s*"/g, '",\n"').replace(/,\s*([}\]])/g, "$1");
  try { return JSON.parse(repaired); } catch { throw new Error("The AI returned an unreadable answer. Try again."); }
}

async function callOne(provider, { messages, maxTokens, json, temperature, image = false }, fetchImpl) {
  const send = () => fetchImpl(provider.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.key}` },
    body: JSON.stringify({
      model: image ? provider.vision : provider.model, temperature, max_completion_tokens: maxTokens, messages,
      ...(provider.reasoning && !image ? { reasoning_effort: "low" } : {}),
      ...(image ? {} : provider.extra || {}),
      ...(json && provider.reasoning ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(90000),
  });
  let response = await send();
  // A short rate-limit wait is worth one retry.
  const retryAfter = Number(response.headers.get("retry-after")) || 4;
  if (response.status === 429 && retryAfter <= 30 && !/per day|TPD/i.test(await response.clone().text().catch(() => ""))) {
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    response = await send();
  }
  if (!response.ok) {
    const daily = response.status === 429 && /per day|TPD/i.test(await response.clone().text().catch(() => ""));
    if (daily) throw Object.assign(new Error(`${provider.name} has used its daily token allowance. It frees up gradually, or add another provider key to .env.local.`), { status: 429 });
    const reason = response.status === 401 || response.status === 403 ? "rejected the server key" : response.status === 429 ? ("is rate-limited. Try again in about a minute") : "could not answer right now";
    throw Object.assign(new Error(`${provider.name} ${reason}.`), { status: response.status });
  }
  const content = (await response.json())?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error(`${provider.name} returned no answer.`);
  return { content: content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(), model: image ? provider.vision : provider.model, provider: provider.name };
}

export async function complete(providers, options, fetchImpl = fetch) {
  if (!providers.length) throw new Error("AI is not configured. Add GROQ_API_KEY (or an NVIDIA nvapi- key) to .env.local.");
  const failures = [];
  for (const provider of providers) {
    // Models sometimes return almost-valid JSON; one more attempt usually fixes it.
    for (let attempt = 0; attempt < (options.json ? 2 : 1); attempt += 1) {
      try {
        const answer = await callOne(provider, { temperature: 0.2, ...options }, fetchImpl);
        return options.json ? { ...answer, data: lenientJson(answer.content) } : answer;
      } catch (failure) {
        if (attempt === 1 || failure.status) { failures.push(failure.message); break; }
        if (!(failure instanceof SyntaxError) && !/unreadable/.test(failure.message)) { failures.push(failure.message); break; }
      }
    }
  }
  throw new Error(providers.length > 1 ? `No AI provider could answer. ${failures.join(" ")}` : failures[0]);
}

const IMAGE_PROMPT = `You are reading one image that a poverty analyst working on Rwanda attached to an investigation.
Write at most 220 words in plain English. Say what the image is (photo, chart, table, map, scanned page, screenshot). Transcribe any visible text, labels and figures exactly as written. For a chart or table, list the categories and their values. For a photo, describe what is visible that could matter for livelihoods, housing, services or programmes, without guessing who people are. If something is unreadable, say so. Never invent figures.`;

// Images are described by a vision model; the description then works like any other source.
export async function describeImage(providers, { mime, base64, name }, fetchImpl = fetch) {
  const capable = providers.filter((item) => item.vision);
  if (!capable.length) throw new Error("No image-reading model is configured.");
  const answer = await complete(capable, { image: true, maxTokens: 700, temperature: 0.1, messages: [{ role: "user", content: [{ type: "text", text: `${IMAGE_PROMPT}

File name: ${String(name).slice(0, 120)}` }, { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } }] }] }, fetchImpl);
  return answer.content.trim();
}
