# R scientific reference

`eicv7_survey.R` reads approved members directly from the raw EICV7 ZIP using
`haven`, joins design fields by household identifier and uses `survey::svydesign`
and `svymean` for person-weighted poverty headcount and standard errors.
It consumes no Python estimates, extracted frames or generated survey weights.
It records archive/member hashes, package versions and its interval method.

Required runtime: R with `survey`, `haven`, `digest`, `jsonlite`.
Set `IREME_RSCRIPT` to an installed Rscript executable if it is not on PATH.
Python entry point: `ireme.r_reference.calculate(raw_archive_path)`.
No runtime or packages are installed implicitly by the calculation.

Status on 2026-10-30: R 4.6.1 provisioned from CRAN for the current user;
installer checksum and Authenticode signature verified. Required binary packages
installed, syntax checked and the raw EICV7 archive calculated for 31 domains.
`installed-packages.json` records the executed environment. Python/R point and SE
differences are recorded in docs/implementation/evidence/python_r_eicv7_comparison.json.
Reference fixtures, review of variable mapping against official documentation,
approved tolerances and independent ownership remain required.
This script was authored in the same engineering session as the Python code;
a separate language does not establish independent ownership.
Production tolerances and scientific approval remain pending.

Intervals use domain degrees of freedom and t quantiles. The primary Python
intervals must not be presumed identical without method reconciliation; the
initial comparison test checks point estimates and SE separately.

Joint district-national differences use `svycontrast` over population means of
domain-weighted poverty and domain membership, retaining covariance with the
national rate. All 30 contrasts were compared against Python's joint Taylor path.
See `python_r_joint_contrasts.json`; this is diagnostic evidence pending approval.
The runner checks source bytes before/after execution and returns the executed
source snapshot alongside its hash for reproducibility.
