# Local data inventory

The supplied Data folder contains 16 files, 315 table/archive entries and 15988 inventoried variables. 1 entry is unreadable and 2 archive metadata entries are recorded as skipped.

Every readable column is present in the searchable workspace catalog and in `investigations/runs/<id>/01-discovering-data.json`. Counts include separate supplied SAV and DTA versions; they are not independent survey samples.

Survey identity and dates inferred from filenames are explicitly provisional. The EICV3–EICV4 panel spans both rounds and is never treated as a single-wave cross-section. Core EICV7 geography and record joins are validated by the analytical adapter.

| File | Tables/entries | Variables | Failed |
| --- | ---: | ---: | ---: |
| FinScope 2012 Financial Inclusion.sav | 1 | 668 | 0 |
| FinScope 2016 Financial Inclusion.sav | 1 | 834 | 0 |
| FinScope 2020 Financial Inclusion.zip | 4 | 2628 | 0 |
| FinScope 2024 Financial Inclusion.dta | 1 | 2442 | 0 |
| Household Living Conditions Survey EICV3 and EICV4 Panel - Part 1.dta | 1 | 33 | 0 |
| Household Living Conditions Survey EICV3 and EICV4 Panel - Part 2.sav | 1 | 33 | 0 |
| Household Living Conditions Survey EICV4 2013-2014 - Part 1.zip | 33 | 1067 | 1 |
| Household Living Conditions Survey EICV4 2013-2014 - Part 2.zip | 34 | 1130 | 0 |
| Household Living Conditions Survey EICV4 2013-2014 Social Protection VUP - Part 1.zip | 29 | 839 | 0 |
| Household Living Conditions Survey EICV4 2013-2014 Social Protection VUP - Part 2.zip | 29 | 834 | 0 |
| Household Living Conditions Survey EICV5 2016-2017 - Part 1.zip | 35 | 956 | 0 |
| Household Living Conditions Survey EICV5 2016-2017 - Part 2.zip | 35 | 956 | 0 |
| Household Living Conditions Survey EICV5 2016-2017 Social Protection VUP - Part 1.zip | 35 | 965 | 0 |
| Household Living Conditions Survey EICV5 2016-2017 Social Protection VUP - Part 2.zip | 35 | 965 | 0 |
| Household Living Conditions Survey EICV7 2023-2024 Social Protection VUP.zip | 20 | 800 | 0 |
| Household Living Conditions Survey EICV7 2023-2024.zip | 21 | 838 | 0 |

## Variable use

- Not comparable: 162
- Not relevant: 4948
- Relevant but unavailable: 208
- Requires processing: 5278
- Restricted: 467
- Unreliable: 4904
- Used: 21

Labels, missing values, types, possible survey weights, geographic identifiers, access restrictions, inferred relationships and classification explanations are retained. Only explicitly validated table/column combinations are marked Used. Missingness and topic heuristics are catalog review flags, not automated survey-design decisions.

## Unreadable and skipped entries

- `Track 2 - Financial Inclusion and Poverty Reduction/T2 Finance and Poverty - FinScope 2020 Financial Inclusion.zip!/__MACOSX/._Rwanda FinScope 2020_Final Data.sav` — Skipped: Unsupported file format or archive metadata.
- `Track 2 - Financial Inclusion and Poverty Reduction/T2 Finance and Poverty - FinScope 2020 Financial Inclusion.zip!/__MACOSX/._Rwanda FinScope 2020_Final Data.dta` — Skipped: Unsupported file format or archive metadata.
- `Track 2 - Financial Inclusion and Poverty Reduction/T2 Finance and Poverty - Household Living Conditions Survey EICV4 2013-2014 - Part 1.zip!/cs_s8b_expenditure.sav` — Failed: ReadstatError: Invalid file, or file has unsupported features

The unreadable EICV4 expenditure SAV has a separately supplied readable DTA counterpart with 32 variables, catalogued independently. Their equivalence is not assumed. A compatible reader or corrected source is needed to prove the SAV's exact contents.

The acceptance test added a CSV derived from real EICV7 aggregates to an isolated temporary data directory. All four added columns were discovered; the original Data folder remained unchanged. Unchanged source hashes reused catalog metadata. Additional files require validated definitions and adapters before contributing new analytical findings.