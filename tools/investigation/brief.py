"""Plain-language analyst conclusions derived only from persisted calculations."""


def analyst_brief(analysis: dict, findings: dict, diagnosis: dict | None = None) -> dict:
    district = analysis["selected"]
    national = analysis["national"]
    name = district["district"]
    gap = round(district["poverty"] - national["poverty"], 1)
    direction = "above" if gap >= 0 else "below"
    observations = [{
        "id": "poverty", "title": "The main problem",
        "text": f"Poverty affects an estimated {district['poverty']:.1f}% of people in {name}, {abs(gap):.1f} percentage points {direction} Rwanda's {national['poverty']:.1f}%. This is the main measured outcome requiring review.",
        "meaning": "This identifies the scale of poverty. It does not identify its cause.",
        "next_step": "Use the within-district evidence below to choose a focused deeper investigation.",
    }]
    context = analysis.get("contextual_analysis")
    if context:
        profile = next(item for item in context["profiles"] if item["district"] == name)
        national_profile = next(item for item in context["profiles"] if item["district"] == "Rwanda")
        groups = profile["poverty_by_group"]
        small = next((item for item in groups if item["group"].startswith("1") and item.get("poverty_pct") is not None), None)
        large = next((item for item in groups if item["group"].startswith("6+") and item.get("poverty_pct") is not None), None)
        if small and large:
            observations.append({"id": "household_size", "title": "A household pattern to investigate",
                "text": f"Poverty is estimated at {large['poverty_pct']:.1f}% among people in households with 6+ members, compared with {small['poverty_pct']:.1f}% in households with 1-3 members in {name}.",
                "meaning": f"These estimates use {large['sample_households']} and {small['sample_households']} surveyed households respectively. The observed pattern is an association; household size has not been established as the cause.",
                "next_step": "Validate dependency, employment and consumption-per-person measures to investigate the association before choosing a response."})
        observations.append({"id": "rural_context", "title": "Where to focus the investigation",
            "text": f"{profile['rural_population_pct']:.1f}% of {name}'s population is estimated to live in rural areas, compared with {national_profile['rural_population_pct']:.1f}% nationally. Average household size is {profile['mean_household_size']:.2f} people, versus {national_profile['mean_household_size']:.2f} nationally.",
            "meaning": "Rural location is established; agriculture, income sources and employment cannot be inferred from location alone.",
            "next_step": "Examine validated rural livelihoods and service-access evidence, rather than assuming all rural households have the same needs."})
    if diagnosis and diagnosis["ranked_drivers"]:
        top = diagnosis["ranked_drivers"][0]
        observations.append({"id": "drivers", "title": "What the data points to",
            "text": top["finding"], "meaning": f"{diagnosis['reading']} {diagnosis['causal_status']}",
            "next_step": "Work through the open research requests to confirm or reject the leading driver before choosing a response."})
    grid_gap = round(district["grid_connection"] - national["grid_connection"], 1)
    if abs(grid_gap) >= 5:
        observations.append({"id": "grid_connection", "title": "A service-access difference",
            "text": f"{district['grid_connection']:.1f}% of households reported a grid connection, compared with {national['grid_connection']:.1f}% nationally: {abs(grid_gap):.1f} points {'lower' if grid_gap < 0 else 'higher'}.",
            "meaning": "Solar-only households are not counted as grid connected. This is not the percentage without any electricity, and it does not prove that electricity caused the poverty gap.",
            "next_step": "Check grid and solar access, affordability and supply reliability before proposing infrastructure or connection support."})
    relevant_conflicts = [item for item in findings["source_conflicts"] if item["district"] == name]
    return {"district": name, "period": "EICV7 2023/24", "headline": f"{name}: {district['poverty']:.1f}% poverty; investigate the measured household and service patterns",
            "observations": observations, "coverage": f"The overall district poverty estimate includes all {district['sample_households']} surveyed households, including urban and rural households. Withholding a small subgroup estimate from display does not remove those households from the district total.",
            "interpretation": "A statistically unclear gap against selected neighbouring districts does not mean poverty is absent, rates are equal, or the overall district estimate is invalid.",
            "decision": "Proceed to focused evidence review; there is enough measured evidence to define an investigation, but not enough to authorize a specific intervention or claim an established cause.",
            "support_question": f"Reported VUP participation among surveyed poor households is {district['vup_among_poor']:.1f}%. Eligibility and delivery records are needed before interpreting unmet programme need.",
            "review_items": relevant_conflicts,
            "not_established": ["Causes of poverty or an intervention's effect", "Programme eligibility or coverage of all social support", "Livelihood and employment explanations, pending validated measures"],
            "source": "https://statistics.gov.rw/sites/default/files/documents/2025-07/EICV7_Main%20Indicator%20Report.pdf"}


def discovery_note(catalog: dict) -> str | None:
    failures = [table for table in catalog["tables"] if table["status"] == "Failed"]
    skipped = catalog["skipped_tables"]
    if not failures and not skipped:
        return None
    historical = sum(table.get("survey") != "EICV7" for table in failures)
    current = len(failures) - historical
    return f"{historical} historical table(s) unreadable; {current} EICV7 table(s) unreadable. {skipped} unsupported/archive-metadata entries recorded. Required EICV7 tables are checked separately before analysis; no failed table is silently used."
