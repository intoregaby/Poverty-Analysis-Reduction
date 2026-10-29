"""Columns the engine really reads, by table, so the catalog can mark them Used.

Keys are lower-case table names exactly as the catalog records them. This file holds data only; tests compare it with the columns each
analysis module reads, so a new column cannot be read without being listed here.
"""

from __future__ import annotations

EICV7_PIPELINE = {
    "cs_eicv7_poverty_file": {"province", "district", "weight", "pop_wt", "pov_jan", "epov_jan", "ur", "member", "clust", "sol_jan", "poverty_line"},
    "cs_s01_s5_s7_household": {"district", "weight", "strata_id", "s5cq1", "s5cq4a", "s5cq14", "s5cq20a", "s5cq22a", "s5cq25", "s5dq3", "s5eq1", "s7aq4"},
    "cs_s0_s1_s2_s3_s4_s6a_s6b_s6c_person": {"district", "weight", "s1q1", "s1q2", "s1q3y", "s3q2", "s3q7", "s3q8", "s3q9", "s3q10", "s3q11", "s3q12",
                                             "s4aq1", "s4aq2", "s4aq2a", "s4aq7", "s4bq4", "s4bq6", "s4bq8", "s6aq2", "s6aq4", "s6aq5", "s6aq6", "s6aq7", "s6bq7", "s6bq8"},
    "cs_s9b_transfers_in": {"s9bq0"},
    "cs_s10c_savings": {"s10cq4", "s10cq8"},
    "cs_s10a1_a2_credits": {"s10aq1", "s10aq2", "s10aq3"},
    "cs_s10b_durables": {"s10bq0", "s10bq2"},
    "cs_s5f_access_to_services": {"s5fq0", "s5fq3a", "s5fq3b"},
    **{table: {"s9d1q1"} for table in ["cs_s9d1_direct_support", "cs_s9d2_classic_public_work", "cs_s9d3_expanded_public_work", "cs_s9d4_nsds", "cs_s9d5_financial_services"]},
}

# EICV7 columns validated against published NISR figures (tools/investigation/variable_checks.py): each reproduces the Main Indicators Report
# value inside the stated tolerance for every check that reads it. Add a column here only after its checks pass.
EICV7_VALIDATED = {
    "cs_s01_s5_s7_household": {"s5aq1", "s5aq2", "s5aq8", "s5cq13", "s5cq16", "s5cq21", "s5cq24", "s5cq26", "s5cq3", "s5cq31", "s5cq32", "s5cq33", "s5cq34", "s5dq1", "s5dq2", "s5dq4"},
    "cs_s0_s1_s2_s3_s4_s6a_s6b_s6c_person": {"s3q3", "s3q4", "s3q5", "s4aq11", "s4bq7", "s4bq13b", "s4bq14a", "s4bq14b", "s4bq14c", "s4bq14d", "s4bq14e", "s4bq14f", "s4bq14g", "s4bq14h", "s4bq14i"},
}

TREND_FILES = {
    "eicv3-poverty-file_jan-2014": {"clust", "district", "pop_wt", "poverty", "epoverty"},
    "eicv4-poverty-file": {"clust", "district", "pop_wt", "pov", "epov"},
    "eicv5_poverty_file": {"clust", "province", "district", "pop_wt", "pov_jan", "epov_jan"},
    "cs_s0_s5_household": {"district", "province"},
    **{f"t2 finance and poverty - household living conditions survey eicv3 and eicv4 panel - part {part}": {"clust", "district", "district_eicv3", "province", "pop_wt", "pop_wt_eicv3", "pov_eicv3", "pov_eicv4"}
       for part in (1, 2)},
}

FINSCOPE_2024 = "t2 finance and poverty - finscope 2024 financial inclusion"
FINSCOPE_2016 = "t2 finance and poverty - finscope 2016 financial inclusion"
FINSCOPE_2020 = "rwanda finscope 2020_final data"
FINSCOPE = {
    FINSCOPE_2024: {"a1", "a2", "a6", "pop_wt", "b1", *[f"qf1_{n:02d}" for n in range(1, 13)], *[f"qf4_{n:02d}" for n in range(1, 12)],
                    "k1", "k3", "k2_1", "k3_1", "g11a", "g3a_03", "g3a_11", "g3a_13", "h3_05", "h3_09", "h3_10", "f5"},
    FINSCOPE_2020: {"individuals_weight", "numvill", "a1", "a2", "a3", "b1", "fas", "banked", "other_formal", "informal", "fm4", "k1_2_1"},
    FINSCOPE_2016: {"individuals_weight", "a1", "a2", "as_revised", "banked_popultaion", "other_formal_non_bank", "informal_revised"},
}
# Columns the 2020 rule check reads (finscope2020.reconstruct), on top of the core columns above.
FINSCOPE_2020_CHECK = {"k1_2_1", "kb2", "qf4_01", "qf5_01", "uf1_01", "fm4", "qf4_04", "qf5_04", "g3a_03", "h4a_04", "uf1_04", "p2_10", "qf4_02", "qf5_02", "qf4_05", "qf5_05", "h4a_02", "h4a_03", "h4a_05", "g3a_02", "g3a_08", "uf1_02", "uf1_03", "uf1_05", "qf4_07", "qf5_07", "g3a_05", "g3a_06", "g3a_07", "g3a_10", "i4_06", "i4_07", "gs9", "uf1_07", "qf4_06", "qf5_06", "i4_01", "i4_02", "i4_03", "i4_04", "i4_05", "i4_08", "i4_09", "ii3a", "uf1_06", "qf4_08", "qf4_09", "qf5_08", "qf5_09", "g3a_11", "g3a_12", "g3a_13", "h4a_08", "h4a_09", "uf1_08", "uf1_09"}
# Regular expressions for columns read by pattern rather than by name.
FINSCOPE_2024_PATTERNS = [r"qf3_\d\d$", r"uf1_\d\d_[12]$", r"i6_\d\d$", r"p2_\d\d_10$"]
USED_PATTERNS = {FINSCOPE_2024: FINSCOPE_2024_PATTERNS}

USED_COLUMNS: dict[str, set[str]] = {}
FINSCOPE[FINSCOPE_2020] = FINSCOPE[FINSCOPE_2020] | FINSCOPE_2020_CHECK
for source in (EICV7_PIPELINE, EICV7_VALIDATED, TREND_FILES, FINSCOPE):
    for table, columns in source.items():
        USED_COLUMNS.setdefault(table, set()).update(columns)
