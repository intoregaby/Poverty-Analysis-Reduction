# Separate raw-data reference calculation using R's survey package.
# Ownership/definition/tolerance review is mandatory before production certification.
# Usage: Rscript eicv7_survey.R ARCHIVE.zip OUTPUT.json
args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 2L) stop("Expected archive and output paths")
for (pkg in c("haven", "survey", "digest", "jsonlite")) {
  if (!requireNamespace(pkg, quietly = TRUE)) stop(paste("Missing R package", pkg))
}
archive <- normalizePath(args[1], mustWork = TRUE)
members <- c("Cross_Section/CS_EICV7_poverty_file.dta", "Cross_Section/CS_S01_S5_S7_Household.dta")
listing <- utils::unzip(archive, list = TRUE)$Name
if (any(vapply(members, function(m) sum(listing == m) != 1L, logical(1)))) {
  stop("Approved archive members must each occur exactly once")
}
work <- tempfile("ireme-r-reference-")
dir.create(work)
run <- function() {
  on.exit(unlink(work, recursive = TRUE), add = TRUE)
  utils::unzip(archive, files = members, exdir = work)
  poverty <- haven::read_dta(file.path(work, members[1]))
  housing <- haven::read_dta(file.path(work, members[2]))
  if (anyDuplicated(poverty$hhid) || anyDuplicated(housing$hhid)) stop("Duplicate household identifiers")
  required <- c("hhid", "pop_wt", "clust", "district", "pov_jan")
  if (!all(required %in% names(poverty)) || !"strata_id" %in% names(housing)) stop("Missing design fields")
  index <- match(poverty$hhid, housing$hhid)
  if (anyNA(index)) stop("Incomplete household design join")
  poverty$stratum <- housing$strata_id[index]
  if (anyNA(poverty[, required]) || anyNA(poverty$stratum)) stop("Missing values in required fields")
  if (any(!is.finite(poverty$pop_wt)) || any(poverty$pop_wt <= 0)) stop("Invalid person weights")
  poverty$district_name <- as.character(haven::as_factor(poverty$district, levels = "labels"))
  classification <- as.character(haven::as_factor(poverty$pov_jan, levels = "labels"))
  if (!all(classification %in% c("Poor", "Non Poor"))) stop("Unrecognised poverty classification")
  poverty$is_poor <- as.numeric(classification == "Poor")
  options(survey.lonely.psu = "fail", survey.adjust.domain.lonely = FALSE)
  design <- survey::svydesign(ids = ~clust, strata = ~stratum, weights = ~pop_wt,
                              data = poverty, nest = TRUE)
  geographies <- c("Rwanda", sort(unique(poverty$district_name)))
  estimates <- lapply(geographies, function(geography) {
    domain <- if (geography == "Rwanda") design else subset(design, district_name == geography)
    estimate <- survey::svymean(~is_poor, domain, na.rm = FALSE)
    degrees <- survey::degf(domain)
    # Method is explicit; no normal CI is silently compared with a t interval.
    interval <- confint(estimate, level = 0.95, df = degrees)
    list(geography = geography, point = unname(coef(estimate)[1]),
         se = unname(survey::SE(estimate)[1]), df = degrees,
         ci_lower = interval[1, 1], ci_upper = interval[1, 2],
         ci_method = "survey-svymean-t-domain-df", unit = "person", measure = "poverty_headcount")
  })
  contrasts <- lapply(setdiff(geographies, "Rwanda"), function(geography) {
    joint_design <- update(design,
       domain_indicator = as.numeric(district_name == geography),
       domain_poor = is_poor * as.numeric(district_name == geography))
    joint_means <- survey::svymean(~domain_poor + domain_indicator + is_poor, joint_design)
    contrast <- survey::svycontrast(joint_means, quote(domain_poor / domain_indicator - is_poor))
    interval <- confint(contrast, level = 0.95, df = survey::degf(design))
    list(geography = geography, comparator = "Rwanda", point = unname(coef(contrast)[1]),
         se = unname(survey::SE(contrast)[1]), df = survey::degf(design),
         ci_lower = interval[1, 1], ci_upper = interval[1, 2],
         ci_method = "joint-design-delta-t", unit = "fraction")
  })
  list(schema = "ireme-r-reference/1", dataset_sha256 = digest::digest(file = archive, algo = "sha256"),
       source_member_sha256 = setNames(lapply(members, function(m) digest::digest(file = file.path(work, m), algo = "sha256")), members),
       packages = setNames(lapply(c("survey", "haven", "digest", "jsonlite"), function(p) as.character(utils::packageVersion(p))),
                           c("survey", "haven", "digest", "jsonlite")),
       r_version = R.version.string, estimates = estimates, contrasts = contrasts,
       certification = "PENDING_INDEPENDENT_OWNERSHIP_AND_SCIENTIFIC_REVIEW")
}
result <- run()
jsonlite::write_json(result, args[2], auto_unbox = TRUE, digits = 17, pretty = TRUE, na = "null")
