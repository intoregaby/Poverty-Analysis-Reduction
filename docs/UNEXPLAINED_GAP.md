# Why most of a district's poverty gap stays unexplained

The driver model splits a district's gap to Rwanda into measured household factors and an unexplained remainder. For Gisagara, about 11% of the 18-point
poverty gap is explained by measured causes and access factors. This note records what was tested to see whether that can be improved, and what limits it.

Everything below is reproducible: `tools/analysis/gap_ceiling.py` and `tools/analysis/gap_land_eicv5.py`. Figures are aggregate only.

## 1. Part of the gap is the measure, not the missing data

Poverty status is a threshold. A household just below the line and one just above it have almost the same spending, so status is hard to predict.
Out of sample (five folds, whole survey clusters held out):

| Model | Poverty status R² | Spending (log consumption per adult equivalent) R² |
|---|---:|---:|
| Current 40 variables | 0.247 | 0.582 |
| + 39 unused household variables (rooms, livestock, shocks by type, materials, water) | 0.262 | 0.630 |
| + rural interactions | 0.265 | 0.636 |
| + province effects | 0.276 | 0.649 |
| + district effects (the most place can add) | 0.294 | 0.664 |

The same factors explain well over half the variation in spending. They explain a quarter of who is poor. The Drivers tab therefore also shows the
gap in typical spending, which is steadier, next to the gap in poverty rate.

## 2. More EICV7 household variables will not close it

Adding each unused candidate to the model on its own (out-of-sample R², poverty status): livestock units +0.007, wall materials +0.002, cooking stove +0.002,
persons per room +0.002, everything else about zero. Typed shocks (drought, prices, illness) added nothing. The larger gains for spending (stove, floor
area, wall materials) are deprivation markers, which are consequences of low spending and not counted as causes.

## 3. Land matters, but does not explain the worst districts

EICV7 as supplied has no land, crop or plot module, so land was tested in EICV5 (2016/17), which has them. A simplified model mirroring the EICV7 one
was fitted with and without five land variables (landless, area per adult equivalent, number of parcels, irrigation, title):

| | Poverty status R² | Spending R² |
|---|---:|---:|
| All households, without land → with land | 0.269 → 0.302 | 0.518 → 0.544 |
| Rural households, without land → with land | 0.228 → 0.268 | 0.394 → 0.440 |

Land is the most useful single addition found, worth about 3 to 4 points of R². It does not systematically close district gaps. Among the six poorest EICV5
districts, the explained share of the poverty gap went down with land in three (Gisagara 56% to 43%, Karongi 21% to 10%, Nyaruguru 62% to 45%), because
those districts do not have unusually little land by these measures. It went up in two (Nyamasheke 12% to 17%, Burera 42% to 51%) and did not change in
one (Rulindo).

Caveats: parcel area units are not documented in the file, so area is used on a log scale only; EICV5 and EICV7 households cannot be linked, so land
cannot be added to the EICV7 model household by household; the EICV5 model is simplified.

## 4. What is left

Measured household factors predict about 25% of who is poor and about 58% of spending, for households they have not seen. The rest is local conditions
the survey does not hold (markets and prices, employer demand, the quality of services, climate and local shocks), income volatility, and measurement error.
These are the items listed as not measured in the driver output. More survey variables would help a little; closing the gap needs local evidence, which is
what the research requests in the diagnosis are for.

The gap cannot be "fixed" by modelling. It can be measured honestly and its limits stated, which the Drivers tab now does.
