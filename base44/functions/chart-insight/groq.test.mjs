import assert from "node:assert/strict";
import test from "node:test";
import { answerChartQuestion, MODEL, validateChartRequest } from "./groq.mjs";

const input = {
  title: "Poverty by District",
  context: "NISR EICV7 2023/24. Nyamagabe poverty 51.4% of people. Rwanda 27.4%.",
  question: "Which rate is higher?",
};

test("rejects missing and oversized chart questions", () => {
  assert.throws(() => validateChartRequest({ ...input, question: " " }), /question/);
  assert.throws(() => validateChartRequest({ ...input, context: "x".repeat(10001) }), /context/);
});

test("never calls the provider without a server key", async () => {
  let called = false;
  await assert.rejects(answerChartQuestion(input, "", () => { called = true; }), /not configured/);
  assert.equal(called, false);
});

test("sends bounded chart context to Groq and returns the answer", async () => {
  const result = await answerChartQuestion(input, "test-only-key", async (url, options) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer test-only-key");
    const body = JSON.parse(options.body);
    assert.equal(body.model, MODEL);
    assert.match(body.messages[0].content, /never infer that the overall poverty rate is incomplete/);
    assert.match(body.messages[1].content, /Nyamagabe poverty 51\.4%/);
    return { ok: true, json: async () => ({ choices: [{ message: { content: "Nyamagabe is higher." } }] }) };
  });
  assert.equal(result.answer, "Nyamagabe is higher.");
});

test("provider authorization errors do not expose response bodies", async () => {
  await assert.rejects(
    answerChartQuestion(input, "test-only-key", async () => ({ ok: false, status: 401 })),
    /rejected the server key/
  );
});
