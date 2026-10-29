"""Aggregate contextual comparisons and explicit survey-design approximations."""

import math
import pandas as pd


def design_variance(frame, influence):
    totals = frame.assign(_influence=influence).groupby(["strata_id", "clust"], observed=True)._influence.sum()
    variance = 0.0
    for _, values in totals.groupby(level=0):
        count = len(values)
        if count < 2:
            raise ValueError("A sampling stratum has fewer than two PSUs; uncertainty needs a reviewed singleton-stratum rule")
        variance += count / (count - 1) * float(((values - values.mean()) ** 2).sum())
    return variance


def ratio(frame, mask):
    weights = frame.pop_wt.astype("float64") * mask.astype(float)
    total = float(weights.sum())
    if total <= 0:
        return None, None
    poor = (frame.pov_jan == "Poor").astype(float)
    estimate = float((weights * poor).sum() / total)
    return estimate, weights * (poor - estimate) / total


def investigate_context(poverty, housing, district, comparator_names):
    frame = poverty.merge(housing[["hhid", "strata_id"]], on="hhid", validate="one_to_one")
    if frame[["clust", "strata_id", "ur", "member"]].isna().any().any():
        raise ValueError("Context analysis requires complete sampling, residence and household-size fields")
    if not frame.ur.isin(["Urban", "Rural"]).all() or not frame.member.between(1, 50).all():
        raise ValueError("Unrecognized residence category or household size")
    if (frame.groupby("clust", observed=True).strata_id.nunique() != 1).any():
        raise ValueError("A survey PSU appears in multiple strata")
    profiles = []
    names = [district, *comparator_names, "Rwanda"]
    for name in names:
        mask = pd.Series(True, index=frame.index) if name == "Rwanda" else frame.district == name
        group = frame[mask]
        people_weights = group.pop_wt.astype("float64")
        household_weights = group.weight.astype("float64")
        profile = {"district": name, "sample_households": len(group),
                   "rural_population_pct": round(float(100 * people_weights[group.ur == "Rural"].sum() / people_weights.sum()), 1),
                   "mean_household_size": round(float((household_weights * group.member).sum() / household_weights.sum()), 2),
                   "poverty_by_group": []}
        for label, subgroup in [("Rural", frame.ur == "Rural"), ("Urban", frame.ur == "Urban"),
                                ("1–3 household members", frame.member <= 3), ("4–5 household members", frame.member.between(4, 5)),
                                ("6+ household members", frame.member >= 6)]:
            selected = mask & subgroup
            count = int(selected.sum())
            estimate, influence = ratio(frame, selected)
            entry = {"group": label, "sample_households": count, "poverty_pct": None, "status": "Suppressed: fewer than 30 surveyed households"}
            if estimate is not None and count >= 30:
                se = math.sqrt(design_variance(frame, influence))
                entry.update({"poverty_pct": round(100 * estimate, 1), "se_points": round(100 * se, 3),
                              "ci_lower": round(max(0, 100 * (estimate - 1.96 * se)), 1),
                              "ci_upper": round(min(100, 100 * (estimate + 1.96 * se)), 1), "status": "Approximate design-based interval"})
            profile["poverty_by_group"].append(entry)
        profiles.append(profile)
    selected_rate, selected_influence = ratio(frame, frame.district == district)
    selected_se = math.sqrt(design_variance(frame, selected_influence)) * 100
    comparisons = []
    for name in comparator_names:
        rate, influence = ratio(frame, frame.district == name)
        gap = selected_rate - rate
        se = math.sqrt(design_variance(frame, selected_influence - influence))
        p_value = math.erfc(abs(gap / se) / math.sqrt(2)) if se > 0 else None
        comparisons.append({"district": name, "gap_points": round(gap * 100, 2), "se_points": round(se * 100, 3),
                            "ci_lower": round((gap - 1.96 * se) * 100, 2), "ci_upper": round((gap + 1.96 * se) * 100, 2),
                            "p_value": p_value})
    previous = 0
    for rank, item in enumerate(sorted(comparisons, key=lambda row: row["p_value"] if row["p_value"] is not None else 1)):
        adjusted = max(previous, min(1, (len(comparisons) - rank) * (item["p_value"] if item["p_value"] is not None else 1)))
        previous = adjusted
        item["holm_adjusted_p"] = round(adjusted, 6)
        item["conclusion"] = "Difference supported under the stated approximation" if adjusted < 0.05 else "Difference not clearly established"
    return {"profiles": profiles, "comparisons": comparisons, "selected_poverty_se_points": round(selected_se, 3), "uncertainty_validated": False,
            "overall_estimate_coverage": {"survey_households": len(frame[frame.district == district]), "includes_urban_and_rural": True,
                "subgroup_suppression_scope": "Display-only application rule for estimates based on fewer than 30 households. These households remain included in the overall district poverty calculation. The overall rate is not incomplete because of subgroup suppression."},
            "survey": "EICV7 2023/24", "sampling": {"psus": int(frame.clust.nunique()), "strata": int(frame.strata_id.nunique())},
            "method": "Ultimate-cluster Taylor linearization of population-weighted poverty ratios using clust and strata_id; full survey retained for domain variance. Normal 1.96 intervals, no finite-population correction. Three pairwise tests use Holm adjustment; displayed gap intervals are individual, unadjusted 95% intervals.",
            "context_units": "Rural share counts people; mean household size uses household weights. Group poverty rates count people. Size bands are descriptive, not risk scores.",
            "limitations": "These are associations, not causal effects or a policy evaluation. Normal approximation and omitted finite-population corrections may differ from NISR's full estimator. Rurality and household size do not by themselves explain the full poverty gap. Livelihood, age and employment definitions still require validation.",
            "source": "https://statistics.gov.rw/sites/default/files/documents/2025-07/EICV7_Main%20Indicator%20Report.pdf"}
