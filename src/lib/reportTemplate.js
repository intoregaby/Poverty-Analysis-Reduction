// The report layout and the plain-English rules, shared by the AI writer (server) and the automated summary (browser).
// Layout follows the standard statistical report outline: title page, executive summary, introduction, methodology,
// results, external evidence verification, discussion, conclusion and recommendations, appendices and references.

import { directionProblems, factsFrom, reviewText } from "./reportChecks.js";
import { verificationSection } from "./reportVerification.js";

// Bump when the saved report shape changes, so older saved reports are shown with the "older layout" notice.
export const REPORT_VERSION = 4;

export const SECTION_TITLES = [
  "Executive summary", "Introduction", "Methodology", "Results and findings", "External evidence verification", "Discussion", "Conclusion and next steps", "Appendices and references",
];

// Every meaning is written for a reader aged about 15 with beginner skills. A meaning never contains another glossary term
// (a test checks this), so inserting one cannot start a chain of explanations.
export const GLOSSARY = [
  { term: "EICV7", pattern: "EICV7", meaning: "the latest national survey of how people live, run by Rwanda's statistics office" },
  { term: "NISR", pattern: "NISR", meaning: "Rwanda's National Institute of Statistics" },
  { term: "extreme poverty", pattern: "extreme poverty", meaning: "not having enough money to buy the food needed for a healthy life" },
  { term: "poverty rate", pattern: "poverty rate", meaning: "the share of people whose spending is below the national poverty line" },
  { term: "standard error", pattern: "standard errors?", meaning: "a number that shows how much a survey result could change just by chance" },
  { term: "confidence interval", pattern: "confidence intervals?|95% CI", meaning: "the range where the true value is very likely to be" },
  { term: "stands out", pattern: "stands? out|clearly differs?", meaning: "is further from the national figure than chance alone would explain" },
  { term: "Use with caution", pattern: "Use with caution", meaning: "the result is rough, so check it before relying on it" },
  { term: "Low reliability", pattern: "Low reliability", meaning: "too few survey answers to trust this number much" },
  { term: "associated with", pattern: "associated with|lines? up with", trailing: true, meaning: "appears together with it in the data, which does not prove one causes the other" },
  { term: "percentage points", pattern: "percentage points?", meaning: "the plain difference between two percentages, found by taking one away from the other" },
  { term: "survey weights", pattern: "survey weights?|weighted", meaning: "each answer counts for the number of similar families it stands for" },
  { term: "household", pattern: "households?", meaning: "people who live together and share meals" },
  { term: "adult equivalent", pattern: "adult[- ]equivalents?", meaning: "a way of counting members so that a child counts for less than an adult" },
  { term: "VUP", pattern: "VUP", meaning: "the Vision 2020 Umurenge Programme, a government programme that supports poor families" },
  { term: "FinScope", pattern: "FinScope", meaning: "a national survey of how people save, borrow and pay" },
  { term: "financially excluded", pattern: "financially excluded|excluded from financial services", meaning: "using no financial service at all, formal or informal" },
  { term: "formal financial services", pattern: "formal (?:financial )?(?:services?|providers?)", meaning: "services from regulated providers such as banks and mobile money" },
  { term: "informal financial services", pattern: "informal (?:financial )?(?:services?|providers?)", meaning: "services outside regulated providers, such as savings groups or lending among friends" },
  { term: "SACCO", pattern: "SACCOs?", meaning: "a savings and credit club owned by its members" },
  { term: "Oaxaca-Blinder", pattern: "Oaxaca[-–]Blinder", meaning: "a method that splits a gap between two groups into a part the measured factors explain and a part left over" },
  { term: "panel", pattern: "panel (?:survey|households?|data)", meaning: "the same families followed over several years" },
];

const compiled = GLOSSARY.map((entry) => ({ ...entry, regex: new RegExp(`(?<![\\w-])(?:${entry.pattern})(?![\\w-])`, "i") }));

// Adds "(meaning)" after the first use of each glossary term. `seen` carries over from one text to the next,
// so a term is explained once per report, at its first use, in reading order.
export function explainTerms(text, seen) {
  if (typeof text !== "string" || !text) return text;
  let output = text;
  for (const entry of compiled) {
    if (seen.has(entry.term)) continue;
    const match = entry.regex.exec(output);
    if (!match) continue;
    seen.add(entry.term);
    const end = match.index + match[0].length;
    if (/^\*{0,2}\s*\(/.test(output.slice(end))) continue;
    if (entry.trailing) {
      // A phrase that sits in the middle of a clause is explained at the end of its sentence, so the sentence still reads smoothly.
      const stop = output.slice(end).search(/[.!?](?:\s|$)/);
      const at = stop === -1 ? output.length : end + stop;
      output = `${output.slice(0, at)} (\u201c${match[0]}\u201d means ${entry.meaning})${output.slice(at)}`;
      continue;
    }
    const close = output.slice(end).match(/^\*{1,2}/)?.[0] || "";
    output = `${output.slice(0, end)}${close} (${entry.meaning})${output.slice(end + close.length)}`;
  }
  return output;
}

export function glossaryFor(seen) {
  return GLOSSARY.filter((entry) => seen.has(entry.term)).map((entry) => ({ term: entry.term, meaning: entry.meaning }));
}

const words = (text) => (text.match(/[A-Za-z0-9%'’.-]+/g) || []).length;

export function readability(texts) {
  const sentences = texts.flatMap((text) => String(text || "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)).filter((sentence) => words(sentence) > 2);
  if (!sentences.length) return { sentences: 0, average_words: 0, long_sentences: 0 };
  const lengths = sentences.map(words);
  return { sentences: sentences.length, average_words: Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) / 10, long_sentences: lengths.filter((value) => value > 28).length };
}

// Facts about how the work was done come from the engine's own results, never from the AI writer.
export function methodologyFrom(result) {
  const findings = result.findings?.findings || [];
  const sample = findings.find((item) => Number(item.sample) > 0)?.sample;
  const read = (result.data_used?.used || []).filter((item) => item.dataset && item.file && !/not|reference/i.test(item.status || ""));
  const fileOf = (item) => String(item.file).replace(/^T2 Finance and Poverty - /, "");
  const main = read.find((item) => /EICV7/.test(item.dataset));
  // Only EICV7 and the published NISR tables supply the figures in this report. The other files are read by the engine for its
  // trend and financial-inclusion views, so they are listed apart and are not described as sources of these figures.
  const dataSources = [
    { role: "used", text: "EICV7 2023/24, the national household survey, was the source of every figure for the district and for Rwanda: poverty, housing, services, health insurance and VUP.", file: main ? fileOf(main) : "" },
    { role: "used", text: "NISR's published EICV7 tables were used to check those figures and to give the survey's uncertainty (see the evidence verification section).", file: "" },
    ...read.filter((item) => item !== main).slice(0, 8).map((item) => ({ role: "available", text: `${item.dataset}: read by the engine for its trend and financial-inclusion views. It is not used for the figures in this report.`, file: fileOf(item) })),
  ];
  const drivers = result.drivers;
  return {
    data_sources: dataSources,
    sampling: [
      sample ? `The district result comes from ${Number(sample).toLocaleString("en-GB")} surveyed households.` : "The district result comes from the households surveyed in this district.",
      "The survey uses survey weights, so the results describe all households and people in the district, not only those visited.",
      "Every result is shown with its standard error where one could be calculated, and is graded for reliability.",
    ],
    tools: [
      "All numbers were calculated by computer program (Python and the pandas library) from the survey files, not typed by hand.",
      "A district is compared with Rwanda using the gap in percentage points and the standard error of that gap.",
      ...(drivers ? ["The gap between the district and Rwanda is split into measured factors and a leftover part using Oaxaca-Blinder."] : []),
      "The AI writer only explains numbers the program has already calculated. A check flags any number it uses that is not in those results.",
    ],
  };
}

export function referencesFrom(result) {
  const register = Array.isArray(result.source_register) ? result.source_register : [];
  const relevant = (item) => /^eicv7|^nisr-eicv7/.test(item.id || "") || item.id === "loda-vup-design";
  return register.filter((item) => item.title && item.url && relevant(item)).map((item) => ({ publisher: item.publisher, title: item.title, url: item.url, period: item.data_period }));
}

const AUTHOR = "District Poverty Investigation Engine (automated analysis for NISR analysts)";

// Turns the writer's parts into the final report: fixed order, plain-English glossary brackets, methodology and references from the engine.
export function assembleReport(parts, result, generatedAt) {
  const seen = new Set();
  const facts = factsFrom(result);
  const corrections = [];
  // Wording is checked against the numbers first (a contradicting sentence is replaced and recorded), then technical terms are explained.
  const fix = (text, path) => { const reviewed = reviewText(text, facts, path); corrections.push(...reviewed.corrections); return reviewed.text; };
  const say = (text, path = "text") => explainTerms(fix(text, path), seen);
  const sayAll = (items, path) => (items || []).map((item, index) => say(item, `${path}[${index + 1}]`));
  const report = {
    version: REPORT_VERSION,
    title: parts.title, subtitle: parts.subtitle, author: AUTHOR, date: generatedAt || new Date().toISOString(),
    executive_summary: { objective: say(parts.objective, "objective"), main_points: sayAll(parts.main_points, "main points") },
    // Labels and notes under the key numbers stay short, so they are checked but not given glossary brackets.
    key_numbers: (parts.key_numbers || []).map((item, index) => ({ ...item, label: fix(item.label, `key number ${index + 1} label`), context: fix(item.context, `key number ${index + 1}`) })),
    introduction: { background: say(parts.background, "background"), questions: sayAll(parts.questions, "questions"), scope: sayAll(parts.scope, "scope") },
    methodology: (() => { const base = methodologyFrom(result); return { data_sources: base.data_sources.map((item) => ({ ...item, text: say(item.text) })), sampling: sayAll(base.sampling), tools: sayAll(base.tools) }; })(),
    results: { sections: (parts.sections || []).map((item) => ({ ...item, body: say(item.body, `results: ${item.heading}`) })), how_sure: say(parts.how_sure, "how sure") },
    discussion: { interpretation: say(parts.interpretation, "interpretation"), comparison: say(parts.comparison, "comparison"), risks: sayAll(parts.risks, "risks") },
    conclusion: { conclusion: say(parts.conclusion, "conclusion"), options: (parts.options || []).map((item, index) => ({ ...item, rationale: say(item.rationale, `option ${index + 1}`), check_first: say(item.check_first, `option ${index + 1} check`) })), next_steps: sayAll(parts.next_steps, "next steps") },
  };
  report.verification = verificationSection(result, corrections);
  report.executive_summary.evidence_check = report.verification.available
    ? `${report.verification.headline}${report.verification.unresolved ? ` ${report.verification.unresolved} issue${report.verification.unresolved === 1 ? "" : "s"} must be resolved before this report is relied on.` : ""}${corrections.length ? ` ${corrections.length} sentence${corrections.length === 1 ? " was" : "s were"} corrected during review; see section 5.` : ""}`
    : report.verification.headline;
  report.appendices = { glossary: glossaryFor(seen), references: referencesFrom(result) };
  // A last pass over the finished text: anything that still contradicts the numbers would be reported here.
  report.validation = { direction_problems: directionProblems(narrativeText(report), facts).length, corrections: corrections.length };
  report.readability = readability([report.executive_summary.objective, ...report.executive_summary.main_points, report.introduction.background, ...report.results.sections.map((item) => item.body), report.discussion.interpretation, report.conclusion.conclusion]);
  return report;
}

// Every piece of narrative text, for checks such as "does every number come from the results".
export function narrativeText(report) {
  return [
    report.executive_summary.objective, ...report.executive_summary.main_points, ...report.key_numbers.map((item) => `${item.value} ${item.context}`),
    report.introduction.background, ...report.introduction.questions, ...report.introduction.scope,
    ...report.results.sections.map((item) => item.body), report.results.how_sure,
    report.discussion.interpretation, report.discussion.comparison, ...report.discussion.risks,
    report.conclusion.conclusion, ...report.conclusion.options.map((item) => `${item.rationale} ${item.check_first}`), ...report.conclusion.next_steps,
  ].filter(Boolean).join(" ");
}
