import { assembleReport } from "@/lib/reportTemplate";

// Used when the AI writer is unavailable: the same eight-part document, built only from the engine's own text.
export function fallbackReport(result, district) {
  const brief = result.analyst_brief;
  const findings = result.findings?.findings || [];
  const lead = findings[0];
  const gap = [result.diagnosis?.reading, result.drivers?.interpretation].find(Boolean);
  return assembleReport({
    title: `${district}: district poverty investigation`,
    subtitle: "EICV7 2023/24 · automated summary",
    objective: `This report shows how poor ${district} is compared with Rwanda, and what in the survey data is associated with that gap.`,
    main_points: findings.slice(0, 4).map((item) => `**${item.title}:** ${item.explanation}`),
    key_numbers: findings.slice(0, 4).map((item) => ({ label: item.title, value: `${Number(item.value).toFixed(1)}%`, context: item.national != null ? `Rwanda ${Number(item.national).toFixed(1)}%` : item.geography })),
    background: lead?.explanation || brief?.headline || "Findings are ready for review.",
    questions: [`How does ${district} compare with Rwanda and with nearby districts?`, "Which household conditions are associated with the gap to Rwanda?"],
    scope: [`Place: ${district}. Time: the 2023/24 survey year.`, ...(result.findings?.not_analyzed || []).slice(0, 2).map((item) => `Not covered: ${item}`)],
    sections: [
      { heading: "What we found", body: findings.slice(0, 4).map((item) => `- **${item.title}:** ${item.explanation}`).join("\n"), chart: "findings" },
      { heading: "How it compares", body: brief?.observations?.[0]?.text || "The district is compared with same-province districts and Rwanda.", chart: "comparison" },
      ...(result.drivers ? [{ heading: "What is associated with the gap", body: gap || "Household conditions associated with the gap to Rwanda.", chart: "drivers" }] : []),
      ...(result.drivers?.depth ? [{ heading: "How deep poverty is", body: result.drivers.depth.note || "How many people are poor, how far below the line they are, and how unequal they are, compared with Rwanda.", chart: "depth" }] : []),
    ].filter((section) => section.body),
    how_sure: "Each result has a reliability grade in the findings tables. Results marked Use with caution need extra care.",
    interpretation: brief?.interpretation || gap || brief?.headline || "",
    comparison: brief?.observations?.[0]?.text || "The district is compared with same-province districts and with Rwanda.",
    risks: [...findings.slice(0, 3).map((item) => item.limitations), ...(result.findings?.not_analyzed || []).slice(0, 2)].filter(Boolean),
    conclusion: brief?.decision || brief?.headline || lead?.explanation || "",
    options: (result.research?.options || []).slice(0, 3).map((item) => ({ title: item.title, rationale: item.evidence, evidence_level: "Published evidence", check_first: item.risk })),
    next_steps: (brief?.observations || []).map((item) => item.next_step).filter(Boolean).slice(0, 4),
  }, result);
}
