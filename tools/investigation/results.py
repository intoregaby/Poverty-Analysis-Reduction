"""Turn calculated estimates into cautious, traceable investigation findings."""

from __future__ import annotations

from .sources import detect_published_rate_conflicts, published_modelled_comparison, published_poverty_intervals, evidence_source

EICV7_URL = "https://statistics.gov.rw/data-sources/surveys/EICV/integrated-household-living-conditions-survey-7-eicv-7"


def prepare_findings(analysis: dict, source_register: dict) -> dict:
    district = analysis["selected"]
    national = analysis["national"]
    name = district["district"]
    findings = []
    official_interval = published_poverty_intervals(source_register).get(name)
    if official_interval and abs(official_interval["rate"] - district["poverty"]) > 0.15:
        official_interval = None

    poverty_gap = round(district["poverty"] - national["poverty"], 1)
    findings.append({
        "id": "poverty", "title": "Poverty rate", "subject": "Poverty",
        "explanation": f"{district['poverty']:.1f}% of people in {name} were below the EICV7 poverty line, compared with {national['poverty']:.1f}% nationally. The district point estimate is {abs(poverty_gap):.1f} percentage points {'above' if poverty_gap >= 0 else 'below'} the national rate.",
        "value": district["poverty"], "national": national["poverty"], "unit": "% of people",
        "sample": district["sample_households"], "period": "2023/24", "geography": name,
        "source": EICV7_URL, "source_file": analysis["source_file"],
        "method": analysis["method"]["poverty"], "evidence_strength": "Published estimate reproduced from weighted microdata",
        "confidence_interval": official_interval,
        "limitations": "NISR's published 95% interval is shown when verified; this district–national gap is descriptive and does not establish a cause." if official_interval else "District confidence interval is unavailable here; this gap is descriptive and does not establish a cause.",
        "next_step": "Check local conditions and the published confidence intervals before selecting an intervention.",
    })

    earlier = published_modelled_comparison(source_register).get(name)
    if earlier and abs(earlier["latest_published"] - district["poverty"]) <= 0.15:
        findings.append({
            "id": "modelled_change", "title": "Method-adjusted change", "subject": "Poverty",
            "explanation": f"NISR estimates {name}'s poverty rate at {earlier['earlier_modelled']:.1f}% in 2016/17 under the EICV7 method, versus {district['poverty']:.1f}% observed in 2023/24. Its published decrease is {earlier['published_decrease_points']:.1f} percentage points.",
            "value": district["poverty"], "national": national["poverty"], "unit": "% of people",
            "earlier_value": earlier["earlier_modelled"],
            "sample": district["sample_households"], "period": "2016/17 modelled → 2023/24 observed", "geography": name,
            "source": earlier["url"], "source_file": analysis["source_file"],
            "method": "NISR's published multiple-imputation comparison; direct EICV5 versus EICV7 subtraction is invalid.",
            "evidence_strength": "Official method-adjusted point estimate; district significance not established here",
            "limitations": "NISR reports clear reductions in only 17 of 30 districts overall; this workflow does not identify which ones. Do not infer this district's change is statistically significant.",
            "next_step": "Consult NISR's district confidence intervals before a trend claim or decision.",
        })

    grid_gap = round(district["grid_connection"] - national["grid_connection"], 1)
    if abs(grid_gap) >= 5:
        findings.append({
            "id": "grid_connection", "title": "Grid connection", "subject": "Living conditions",
            "explanation": f"{district['grid_connection']:.1f}% of surveyed {name} households reported an electricity grid connection, compared with {national['grid_connection']:.1f}% nationally.",
            "value": district["grid_connection"], "national": national["grid_connection"], "unit": "% of households",
            "sample": district["sample_households"], "period": "2023/24", "geography": name,
            "source": EICV7_URL, "source_file": analysis["source_file"],
            "method": analysis["method"]["grid_connection"], "evidence_strength": "Weighted survey point estimate",
            "limitations": "No district design-adjusted confidence interval or infrastructure feasibility assessment is available here.",
            "next_step": "Investigate access, affordability, and connection options with the responsible utility before proposing work.",
        })

    findings.append({
        "id": "vup_among_poor", "title": "Reported VUP participation", "subject": "Social protection",
        "explanation": f"{district['vup_among_poor']:.1f}% of surveyed poor households in {name} reported a member participating in a VUP component; the national estimate is {national['vup_among_poor']:.1f}%.",
        "value": district["vup_among_poor"], "national": national["vup_among_poor"], "unit": "% of surveyed poor households",
        "sample": district["sample_poor_households"], "period": "2023/24", "geography": name,
        "source": EICV7_URL, "source_file": analysis["source_file"],
        "method": analysis["method"]["vup_among_poor"], "evidence_strength": "Weighted survey point estimate; eligibility unknown",
        "limitations": "This is neither all social support nor a measure of eligible households receiving payment. A lower or higher rate alone does not establish programme performance.",
        "next_step": "Review eligibility and administrative delivery records only with authorized access.",
    })

    insurance_gap = round(district["health_insurance"] - national["health_insurance"], 1)
    if abs(insurance_gap) >= 5:
        findings.append({
            "id": "health_insurance", "title": "Health insurance", "subject": "Health",
            "explanation": f"{district['health_insurance']:.1f}% of surveyed people in {name} reported current health insurance, compared with {national['health_insurance']:.1f}% nationally.",
            "value": district["health_insurance"], "national": national["health_insurance"], "unit": "% of people",
            "sample": district["sample_people_health"], "period": "2023/24", "geography": name,
            "source": EICV7_URL, "source_file": analysis["source_file"],
            "method": analysis["method"]["health_insurance"], "evidence_strength": "Weighted survey point estimate",
            "limitations": "Respondents answering Don't know are excluded; district confidence intervals are not calculated.",
            "next_step": "Check official insurance statistics and local barriers before recommending changes.",
        })

    conflicts = detect_published_rate_conflicts(source_register, analysis["all_districts"])
    return {
        "district": name, "findings": findings[:5], "source_conflicts": conflicts,
        "priority_rule": "Lead with the published poverty outcome, then the official method-adjusted comparison if verified. Show other district measures when their descriptive district–national gap is at least five points; VUP is always shown as context. No composite score or significance claim is made. District population affected is not estimated.",
        "not_analyzed": analysis["not_analyzed"],
        "comparison_rule": analysis["method"]["comparators"],
    }


def research_options(findings: dict, sources: dict, diagnosis: dict | None = None) -> dict:
    options = []
    vup = evidence_source(sources, "eicv7-vup")
    if vup and vup["status"] == "Completed":
        options.append({
            "title": "Review existing VUP delivery", "related_finding": "vup_among_poor",
            "evidence": "NISR describes VUP components and beneficiary experiences in its 2023/24 thematic report.",
            "source_id": vup["id"], "source_url": vup["url"], "evidence_type": "Descriptive programme report, not a causal impact evaluation",
            "feasibility": "Requires authorized eligibility and delivery records, programme-owner review, and district context.",
            "resources": "Unknown; no budget or staffing estimate is evidenced.",
            "risk": "Survey participation does not identify eligible non-recipients or prove that a component should expand.",
            "status": "Research option only — no operational recommendation",
        })
    utilities = evidence_source(sources, "eicv7-utilities")
    if utilities and utilities["status"] == "Completed" and any(item["id"] == "grid_connection" for item in findings["findings"]):
        options.append({
            "title": "Investigate electricity access barriers", "related_finding": "grid_connection",
            "evidence": "NISR documents 2023/24 amenities and utilities; the district survey estimate indicates a descriptive gap.",
            "source_id": utilities["id"], "source_url": utilities["url"], "evidence_type": "Descriptive needs evidence, not intervention effectiveness",
            "feasibility": "Needs utility data, costs, terrain, household affordability, and an authorized local feasibility study.",
            "resources": "Unknown; no infrastructure budget is evidenced.",
            "risk": "The survey alone cannot identify whether grid extension, solar, or affordability support is suitable.",
            "status": "Research option only — no operational recommendation",
        })
    for driver in (diagnosis or {}).get("ranked_drivers", [])[:3]:
        if not driver["response_families"]:
            continue
        reachable = [source for source in driver["sources"] if source["reachable"]]
        options.append({
            "title": f"Research responses for: {driver['label'].lower()}", "related_finding": "drivers",
            "evidence": driver["finding"], "driver_id": driver["id"], "driver_grade": driver["grade"],
            "source_id": reachable[0]["id"] if reachable else None, "source_url": reachable[0]["url"] if reachable else None,
            "reading_list": reachable,
            "evidence_type": "Adjusted survey association plus a mechanism hypothesis, not an impact evaluation",
            "response_families": driver["response_families"], "confirm_with": driver["confirm_with"],
            "feasibility": "Needs local feasibility, cost and delivery evidence from the responsible institution.",
            "resources": "Unknown; no budget or staffing estimate is evidenced.",
            "risk": "The association may partly reflect poverty causing the factor. Response effects depend on programme design and place.",
            "status": "Research option only — no operational recommendation",
        })
    return {
        "options": options[:6],
        "conclusion": "No intervention has sufficient district-specific effectiveness and feasibility evidence for automatic action. Analyst review or more data is needed.",
        "stage_status": "Warning" if not options else "Completed",
    }


def draft_action_plan(analysis: dict, findings: dict, research: dict, diagnosis: dict | None = None) -> dict:
    drivers = (diagnosis or {}).get("ranked_drivers", [])[:3]
    return {
        "district": analysis["district"],
        "verified_problem": findings["findings"][0]["explanation"],
        "supporting_evidence": [item["id"] for item in findings["findings"]],
        "proposed_intervention": None,
        "responsible_institution": None,
        "target_drivers": [{"driver": item["label"], "grade": item["grade"], "points_of_gap": item["contribution_points"]} for item in drivers],
        "candidate_response_families_to_evaluate": sorted({family for item in drivers for family in item["response_families"]}),
        "open_research_requests": [item["id"] + ": " + item["question"] for item in (diagnosis or {}).get("research_requests", [])],
        "proposed_activities": ["Analyst reviews source conflict, survey limits, and local context", "Work through the open research requests with the responsible institutions", "Request authorized programme and utility feasibility evidence"],
        "proposed_task_owners": [], "resources_needed": "Unknown; requires feasibility and owner input",
        "expected_outputs": "Evidence review and a decision on whether an operational proposal is justified",
        "measurable_outcomes": [],
        "approval_status": "Draft — evidence review required; no operational authorization",
        "work_items_created": 0,
        "evaluation_status": "Awaiting approved action and verified follow-up information",
        "causal_claim": False,
        "reason": research["conclusion"],
    }
