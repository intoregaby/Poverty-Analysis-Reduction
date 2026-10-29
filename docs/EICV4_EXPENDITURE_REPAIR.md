# EICV4 expenditure table (cs_s8b_expenditure) repair findings

Date: 2026-10-27
Scope: diagnosis only. No project code was changed. Nothing in the Data folder was modified.

## Recommendation

**Outcome (a): the DTA is complete and matches the SAV's readable rows. It is safe to use the DTA as the source of truth for the EICV4 expenditure table.**

The SAV in Part 1 is truncated, so it should not be used. A fresh copy from NISR is not needed for this table.

## Files

| File | Archive | Size inside archive |
|---|---|---|
| cs_s8b_expenditure.sav | EICV4 2013-2014 - Part 1.zip | 83,496,960 bytes |
| cs_s8b_expenditure.dta | EICV4 2013-2014 - Part 2.zip | 665,568,560 bytes |

Both archives extracted with "Everything is Ok" (exit code 0).

## Commands used

Tools: 7-Zip 26.05 at `D:\application\7-Zip\7-Zip\7z.exe` (installed under D:\application, not C:\Program Files; the folder name contains a non-standard hyphen character, so the script located it with Get-ChildItem instead of typing the path). Python with pandas 2.3.3 and pyreadstat 1.3.7.

1. New empty working folder: `D:\Project\_work_eicv4_s8b` with subfolders `dta`, `sav`, `script`.
2. Extraction (only the two named members):
   - `7z e "<Part 2 zip>" "cs_s8b_expenditure.dta" -r -o"D:\Project\_work_eicv4_s8b\dta" -y`
   - `7z e "<Part 1 zip>" "cs_s8b_expenditure.sav" -r -o"D:\Project\_work_eicv4_s8b\sav" -y`
3. Comparison, run in isolated mode, with the script kept in the separate `script` folder:
   - `python -I D:\Project\_work_eicv4_s8b\script\compare.py <dta> <sav> 793992`
   - DTA read with `pandas.read_stata(convert_categoricals=False)`.
   - SAV read with `pyreadstat.read_sav(..., encoding="latin1", row_limit=793992, apply_value_formats=False)`.
4. Output saved to `D:\Project\_work_eicv4_s8b\script\results.txt`. Only counts, column names and aggregates were printed. No respondent rows were printed.

Two earlier attempts failed before extracting anything (wrong 7-Zip path). They read no data and changed nothing.

## Results

### DTA read

- Rows read: **2,119,593**. The DTA header also states 2,119,593 rows.
- Columns: 32.
- Read warnings: none.

### Column names

- All 32 column names match the SAV, in the same order.
- Columns: hhid, province, district, ur2012, ur2_2012, region, weight, clust, s8bq0, s8bq0d, s8bq1, s8bq1d, s8bq2 to s8bq13, hhtype, rwanda, surveyh, quintile, poverty, Consumption, s0q19m, s0q19y.

### Row comparison (SAV readable part: first 793,992 rows)

- Same position: 793,992 of 793,992 rows match, 0 differ. No column has a differing cell.
- Ignoring order: 0 SAV rows are missing from the DTA.
- **Extra rows in the DTA beyond the SAV readable part: 1,325,601.**
- No re-sorting was needed because the order is identical.

How the match was tested: numeric columns were compared as numbers rounded to 6 decimals. Columns s8bq0d and s8bq1d were compared as text after trimming spaces. Value labels were not compared (both files read as raw codes).

### Why the SAV is short

- Each household has exactly 147 rows.
- 793,992 = 5,401 complete households x 147 + 45 rows. The SAV stops in the middle of its 5,402nd household.
- The missing 1,325,601 rows = the remaining 102 rows of that household + 9,017 households x 147.

### Checks on the DTA (full file)

- Duplicate key rows (hhid + s8bq0): 0.
- hhid missing: 0. Unique households: 14,419.
- Rows per household: min 147, median 147, max 147. No household has fewer rows than the median.
- weight: 0 missing, 0 zero or negative, minimum 46.71.
- district: 0 missing, 0 households with more than one value.
- province: 0 missing, 0 households with more than one value.
- Districts mapped to more than one province: 0.

### Checks on the SAV readable part

- Same checks pass (0 duplicates, 0 missing hhid, weight positive, no district or province conflicts).
- 5,402 households, of which 1 is partial (45 rows instead of 147). This is the cut-off household.

## Why I consider the DTA complete

- The row count in the file header equals the rows actually read.
- Every one of the 14,419 households has exactly 147 rows, so nothing is cut off at the end.
- The first 793,992 rows are identical to the SAV.
- No read warnings, no key duplicates, no missing ids, no geography conflicts.

Limit of this check: the SAV does not store its total row count, and I did not compare 14,419 households against an NISR document. Please confirm the household count against NISR's EICV4 documentation when convenient.

## Next step

Proposal for `tools\investigation\catalog.py` is described separately and has not been applied. Waiting for approval.
