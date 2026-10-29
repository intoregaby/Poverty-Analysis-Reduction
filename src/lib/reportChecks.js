// Checks the wording of a report against the numbers it describes. The numbers are never changed: a sentence that says the
// opposite of the data is replaced by a sentence built from the data, and each replacement is recorded so it can be shown.

const LABELS = {
  poverty: "The poverty rate", extreme_poverty: "The extreme poverty rate", grid_connection: "Grid electricity connection",
  health_insurance: "Health insurance coverage", vup_among_poor: "VUP participation among poor households",
};

// The most specific indicator is tested first, so "extreme poverty" is not also read as "poverty".
const MENTIONS = [
  { id: "extreme_poverty", pattern: /extreme[- ]poverty/i },
  { id: "grid_connection", pattern: /electricity|grid\b|power connection/i },
  { id: "health_insurance", pattern: /health[- ]insurance|insured|insurance (?:cover|coverage)/i },
  { id: "vup_among_poor", pattern: /\bVUP\b/i },
  { id: "poverty", pattern: /poverty|\bpoor (?:people|households)\b/i },
];
// A comparison with Rwanda is a direction word aimed straight at the national figure: "below the national average", "higher than Rwanda's 27.4%".
// "Below the poverty line" or "below the EICV7 poverty line" is not a comparison with the national figure and is never matched.
const TOWARD_NATIONAL = String.raw`\s+(?:the\s+)?(?:(?:overall|whole|entire)\s+)?(?:national|nationwide|countrywide|rwanda(?:'s|\u2019s)?|country(?:'s|\u2019s)?)\b`;
const BELOW = new RegExp(String.raw`\b(?:below|(?:lower|less)(?:\s+than)?|under|beneath|behind)` + TOWARD_NATIONAL, "i");
const ABOVE = new RegExp(String.raw`\b(?:above|(?:higher|greater|more)(?:\s+than)?|exceed(?:s|ing)?|ahead\s+of)` + TOWARD_NATIONAL, "i");
const GROUP_WORD = /\b(both|all|each|these|those|the two|neither)\b/i;

export const splitSentences = (text) => String(text || "").split(/(?<=[.!?])\s+(?=[A-Z0-9*])/);
const splitClauses = (sentence) => sentence.split(/;|,?\s+(?:while|whereas|but|however)\s+/i);

export function mentionsIn(text) {
  let rest = String(text);
  const found = [];
  for (const { id, pattern } of MENTIONS) {
    if (pattern.test(rest)) { found.push(id); rest = rest.replace(new RegExp(pattern.source, "gi"), " "); }
  }
  return found;
}

function claimedDirection(clause) {
  const below = BELOW.test(clause);
  const above = ABOVE.test(clause);
  if (below === above) return null;
  return below ? "below" : "above";
}

// facts: [{ id, district_value, national_value, direction }]
export function directionProblems(text, facts) {
  const byId = new Map(facts.map((fact) => [fact.id, fact]));
  const sentences = splitSentences(text);
  const problems = [];
  let previous = [];
  sentences.forEach((sentence, index) => {
    const bad = new Set();
    for (const clause of splitClauses(sentence)) {
      const claimed = claimedDirection(clause);
      if (!claimed) continue;
      const own = mentionsIn(clause);
      const targets = own.length ? own : GROUP_WORD.test(clause) ? previous : [];
      for (const id of targets) {
        const fact = byId.get(id);
        if (fact && fact.direction !== "equal" && fact.direction !== claimed) bad.add(id);
      }
    }
    if (bad.size) {
      const ids = [...new Set([...mentionsIn(sentence), ...(GROUP_WORD.test(sentence) ? previous : [])])].filter((id) => byId.has(id));
      problems.push({ index, sentence, ids: ids.length ? ids : [...bad], wrong: [...bad] });
    }
    previous = mentionsIn(sentence).length ? mentionsIn(sentence) : previous;
  });
  return problems;
}

const pct = (value) => `${Number(value).toFixed(1)}%`;

export function describeFacts(ids, facts) {
  const byId = new Map(facts.map((fact) => [fact.id, fact]));
  return ids.map((id) => byId.get(id)).filter(Boolean).map((fact) => {
    const label = LABELS[fact.id] || fact.id;
    const verb = fact.direction === "equal" ? "equal to" : fact.direction;
    return `${label} is ${pct(fact.district_value)}, ${verb} the national figure of ${pct(fact.national_value)}`;
  }).join("; ") + ".";
}

const CAUSAL = [
  [/\b(explain|explains)\b(?=\s+[\d.]+\s+percentage points)/gi, "line up with", "Said the factor \"explains\" part of the gap; the decomposition shows association only."],
  [/\bexplained\b(?=\s+[\d.]+\s+percentage points)/gi, "lined up with", "Said the factor \"explained\" part of the gap; the decomposition shows association only."],
  [/\bcaused by\b/gi, "associated with", "Causal wording; the survey shows association only."],
  [/\bbecause of\b/gi, "linked to", "Causal wording; the survey shows association only."],
  [/\bleads? to\b/gi, "is associated with", "Causal wording; the survey shows association only."],
  [/\bdue to\b/gi, "linked to", "Causal wording; the survey shows association only."],
];

// Percentages should read the same way everywhere: one decimal place, including the ends of a range.
export function tidyDecimals(text) {
  return String(text)
    .replace(/(\d+\.\d{2,})(?=\s+to\s+\d+(?:\.\d+)?\s*(?:%|percent))/gi, (token) => Number(token).toFixed(1))
    .replace(/(\d+\.\d{2,})(\s?(?:%|percent\b))/gi, (_, number, unit) => `${Number(number).toFixed(1)}${unit}`);
}

// Returns the corrected text and what was changed. Nothing is changed silently.
export function reviewText(text, facts, path) {
  if (typeof text !== "string" || !text) return { text, corrections: [] };
  const corrections = [];
  let output = text;
  const problems = directionProblems(output, facts);
  if (problems.length) {
    const sentences = splitSentences(output);
    for (const problem of problems) {
      const corrected = describeFacts(problem.ids, facts);
      corrections.push({ path, kind: "direction", original: problem.sentence, corrected, reason: `The wording contradicts the data: ${describeFacts(problem.wrong, facts).replace(/\.$/, "")}.` });
      sentences[problem.index] = corrected;
    }
    output = sentences.join(" ");
  }
  for (const [pattern, replacement, reason] of CAUSAL) {
    if (pattern.test(output)) {
      corrections.push({ path, kind: "language", original: output.match(pattern)[0], corrected: replacement, reason });
      output = output.replace(pattern, replacement);
    }
    pattern.lastIndex = 0;
  }
  output = tidyDecimals(output);
  return { text: output, corrections };
}

export function factsFrom(result) {
  const given = result.verification?.directions;
  if (Array.isArray(given) && given.length) return given.map((item) => ({ id: item.id, district_value: item.district_value, national_value: item.national_value, direction: item.direction }));
  return (result.findings?.findings || []).filter((item) => item.id !== "modelled_change" && Number.isFinite(Number(item.value)) && Number.isFinite(Number(item.national)))
    .map((item) => ({ id: item.id, district_value: Number(item.value), national_value: Number(item.national), direction: item.value > item.national ? "above" : item.value < item.national ? "below" : "equal" }));
}
