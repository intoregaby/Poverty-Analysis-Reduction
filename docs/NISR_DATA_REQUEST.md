# Data request to NISR (draft)

To: NISR data access / EICV team
Subject: Track 2 hackathon: replacement EICV4 expenditure file and EICV land and agriculture modules

Hello,

We are working on Track 2 (Financial Inclusion and Poverty Reduction) with the data NISR supplied. Two gaps limit what we can report honestly. We would be grateful for the following.

1. **EICV4 2013-2014 consumption/expenditure file.** The copy we received (the SPSS `.sav` expenditure table) ends part-way through: the file is shorter than its header says, so the last records cannot be read. Could you send a fresh copy, or its checksum so we can confirm ours is damaged? Until then we use NISR's published EICV4 figures only and do not recompute from this file.
2. **EICV7 2023-2024 land, crop/plot and agriculture modules.** The supplied EICV7 archive has no land or agriculture tables. In EICV5 these modules added about 3 to 4 points of explanatory power for household spending, so they matter for explaining district poverty gaps. If they exist as a separate release, could you share them or point us to the right access route?

We use the data only for aggregate analysis (district and national figures) and do not publish household records.

Thank you,
[Name, team, contact]

## Questions asked through the hackathon organisers (29 October 2026)

Asked of the NISR hackathon organisers and the two survey experts they named (FinScope, poverty computation). Aggregate figures only; no household records were shared.

| # | Question | Our numbers | Status |
|---|---|---|---|
| 3 | **FinScope 2012:** which products count as banked and as other formal, and are any respondent filters applied? The 2012 file has no access-strand variable. | We rebuilt 19.5% banked, 21.2% other formal, 29.4% informal only, 29.8% excluded. NISR published 23%, 19%, 30%, 28%. | **No definition received before submission.** The organisers said NISR applies filters we may not have applied. The FinScope expert said the analysts who built the 2012 groups have left NISR and that they would follow up after the submission date. 2012 stays out of the financial inclusion chart. |
| 4 | **EICV3:** is `EICV3-Poverty-file_Jan-2014.sav` a January 2014 re-estimate, and which figure should be used for trends? | The file gives 46.0% poor (weights `pop_wt`; 95% interval 44.4 to 47.7). NISR published 44.9% for 2010/11. EICV4, EICV5 and EICV7 reproduce the published figures exactly with the same method. | **Awaiting a reply from the poverty computation expert.** Until then the chart shows NISR's published 44.9%, the district changes use the supplied file, and the dashboard says so in a data note. |

We have not tuned any filter to match a published figure: without NISR's definition that would make an unverified number look validated.
