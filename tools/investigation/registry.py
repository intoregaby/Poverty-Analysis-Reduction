"""Registered information sources beyond the six NISR/LODA PDFs.

Any HTTPS source may be registered. Each entry declares who publishes it, what it is used for and how far
it can be trusted. Retrieval status, hash and any failure are recorded on every run and the README source
table is generated from this registry (``python -m tools.investigation.source_docs``).

Trust tiers
  1  Official national statistics and government publications. May support calculations and findings.
  2  Multilateral agencies and evidence clearinghouses. May support context, cross-checks and response research.
  3  Any other source added by an analyst. Reading material only: never used for a calculation or as the sole basis of a finding.
"""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

EXTRA_FILE = Path(__file__).with_name("extra_sources.json")

WORLD_BANK_INDICATORS = [
    ("SI.POV.NAHC", "Poverty headcount at national poverty lines (% of population)"),
    ("SI.POV.DDAY", "Poverty headcount at $3.00 a day, 2021 PPP (% of population)"),
    ("SI.POV.GINI", "Gini index (inequality of consumption)"),
    ("SL.AGR.EMPL.ZS", "Employment in agriculture (% of total employment)"),
    ("SP.RUR.TOTL.ZS", "Rural population (% of total population)"),
    ("EG.ELC.ACCS.ZS", "Access to electricity (% of population)"),
]

ADDITIONAL_SOURCES = [
    {
        "id": "worldbank-wdi", "tier": 2, "kind": "worldbank-api",
        "publisher": "World Bank", "title": "World Development Indicators — Rwanda (API)",
        "url": "https://api.worldbank.org/v2/country/RWA/indicator/",
        "data_period": "Latest available observation per indicator", "geographic_coverage": "Rwanda (national only)",
        "measurement_definition": "National poverty, inequality, agriculture employment, rurality and electricity series",
        "methodology": "World Bank harmonised series built from national surveys; used to cross-check NISR national figures, never district figures",
        "use": "Independent cross-check of the national poverty rate and national context",
    },
    {
        "id": "nisr-eicv7-portal", "tier": 1, "kind": "html",
        "publisher": "National Institute of Statistics of Rwanda", "title": "EICV7 survey page and microdata access",
        "url": "https://statistics.gov.rw/data-sources/surveys/EICV/integrated-household-living-conditions-survey-7-eicv-7",
        "data_period": "2023/24", "geographic_coverage": "Rwanda and districts",
        "measurement_definition": "Survey description, reports and microdata terms",
        "methodology": "Publisher landing page; confirms current report and data availability",
        "use": "Where NISR publishes EICV7 reports and microdata; check for revisions",
    },
    {
        "id": "nisr-home", "tier": 1, "kind": "html",
        "publisher": "National Institute of Statistics of Rwanda", "title": "NISR statistics portal",
        "url": "https://statistics.gov.rw/",
        "data_period": "Continuously updated", "geographic_coverage": "Rwanda",
        "measurement_definition": "Official statistics catalogue (labour force, census, agriculture, prices)",
        "methodology": "Publisher portal; individual publications must be registered before they support a finding",
        "use": "Route to labour-force, census, agriculture and price publications",
    },
    {
        "id": "dhs-rwanda", "tier": 2, "kind": "html",
        "publisher": "The DHS Program (USAID-funded, with NISR and Ministry of Health)", "title": "Rwanda Demographic and Health Surveys",
        "url": "https://dhsprogram.com/countries/Country-Main.cfm?ctry_id=36",
        "data_period": "Survey rounds through the latest Rwanda DHS", "geographic_coverage": "Rwanda, provinces and some districts",
        "measurement_definition": "Child nutrition, health, education, women's status and household assets",
        "methodology": "Nationally representative household survey; different sample and period from EICV7",
        "use": "Triangulate child stunting, health and education drivers",
    },
    {
        "id": "fao-giews-rwanda", "tier": 2, "kind": "html",
        "publisher": "Food and Agriculture Organization (GIEWS)", "title": "GIEWS Country Brief — Rwanda",
        "url": "https://www.fao.org/giews/countrybrief/country.jsp?code=RWA",
        "data_period": "Current season", "geographic_coverage": "Rwanda",
        "measurement_definition": "Crop prospects, food prices and food-security situation",
        "methodology": "FAO early-warning assessment; national narrative, not district estimates",
        "use": "Seasonal and price shocks that district survey data cannot show",
    },
    {
        "id": "wfp-rwanda", "tier": 2, "kind": "html",
        "publisher": "World Food Programme", "title": "WFP in Rwanda",
        "url": "https://www.wfp.org/countries/rwanda",
        "data_period": "Current", "geographic_coverage": "Rwanda",
        "measurement_definition": "Food security, resilience and school feeding programme context",
        "methodology": "Agency programme page",
        "use": "Food-security and resilience programme context",
    },
    {
        "id": "undp-hdr", "tier": 2, "kind": "html",
        "publisher": "United Nations Development Programme", "title": "Human Development Reports — country data",
        "url": "https://hdr.undp.org/data-center/specific-country-data",
        "data_period": "Latest report", "geographic_coverage": "Countries",
        "measurement_definition": "Human development and multidimensional poverty indices",
        "methodology": "Index construction documented by UNDP",
        "use": "Multidimensional poverty framing for cross-checks",
    },
    {
        "id": "jpal-rwanda", "tier": 2, "kind": "html",
        "publisher": "Abdul Latif Jameel Poverty Action Lab (J-PAL)", "title": "J-PAL randomised evaluations in Rwanda",
        "url": "https://www.povertyactionlab.org/evaluations?f%5B0%5D=country%3ARwanda",
        "data_period": "Evaluations of various years", "geographic_coverage": "Rwanda",
        "measurement_definition": "Randomised evaluations of poverty-reduction programmes",
        "methodology": "Impact evaluations; results apply to the studied programme and place",
        "use": "Find impact evidence for candidate responses before proposing action",
    },
    {
        "id": "worldbank-rwanda", "tier": 2, "kind": "html",
        "publisher": "World Bank", "title": "World Bank — Rwanda country page",
        "url": "https://www.worldbank.org/en/country/rwanda",
        "data_period": "Current", "geographic_coverage": "Rwanda",
        "measurement_definition": "Country overview, projects and reports",
        "methodology": "Publisher overview; individual reports must be registered before they support a finding",
        "use": "Route to Rwanda poverty assessments and project evaluations",
    },
    {
        "id": "afdb-rwanda", "tier": 2, "kind": "html",
        "publisher": "African Development Bank", "title": "AfDB — Rwanda",
        "url": "https://www.afdb.org/en/countries/east-africa/rwanda",
        "data_period": "Current", "geographic_coverage": "Rwanda",
        "measurement_definition": "Country strategy and project portfolio",
        "methodology": "Publisher overview",
        "use": "Infrastructure and rural-development financing context",
    },
    {
        "id": "unicef-rwanda", "tier": 2, "kind": "html",
        "publisher": "UNICEF", "title": "UNICEF Rwanda",
        "url": "https://www.unicef.org/rwanda/",
        "data_period": "Current", "geographic_coverage": "Rwanda",
        "measurement_definition": "Child poverty, nutrition and education programme context",
        "methodology": "Agency programme page",
        "use": "Child-focused response context",
    },
    {
        "id": "minecofin", "tier": 1, "kind": "html",
        "publisher": "Ministry of Finance and Economic Planning", "title": "MINECOFIN portal (NST2, budget)",
        "url": "https://www.minecofin.gov.rw/",
        "data_period": "Current", "geographic_coverage": "Rwanda",
        "measurement_definition": "National Strategy for Transformation and budget documents",
        "methodology": "Government portal; policy targets, not outcome data",
        "use": "National targets and budget lines a response must align with",
    },
    {
        "id": "minagri", "tier": 1, "kind": "html",
        "publisher": "Ministry of Agriculture and Animal Resources", "title": "MINAGRI portal",
        "url": "https://www.minagri.gov.rw/",
        "data_period": "Current", "geographic_coverage": "Rwanda",
        "measurement_definition": "Agriculture policy and programmes",
        "methodology": "Government portal",
        "use": "Agricultural programmes relevant to farm-dependent households",
    },
    {
        "id": "moh", "tier": 1, "kind": "html",
        "publisher": "Ministry of Health", "title": "MOH portal",
        "url": "https://www.moh.gov.rw/",
        "data_period": "Current", "geographic_coverage": "Rwanda",
        "measurement_definition": "Health policy and programmes",
        "methodology": "Government portal",
        "use": "Health-cost and community-health context",
    },
    {
        "id": "mineduc", "tier": 1, "kind": "html",
        "publisher": "Ministry of Education", "title": "MINEDUC portal",
        "url": "https://www.mineduc.gov.rw/",
        "data_period": "Current", "geographic_coverage": "Rwanda",
        "measurement_definition": "Education policy, TVET and skills programmes",
        "methodology": "Government portal",
        "use": "Skills and TVET programme context",
    },
    {
        "id": "rssb", "tier": 1, "kind": "html",
        "publisher": "Rwanda Social Security Board", "title": "RSSB portal (Mutuelle de Santé)",
        "url": "https://www.rssb.rw/",
        "data_period": "Current", "geographic_coverage": "Rwanda",
        "measurement_definition": "Social security and community-based health insurance",
        "methodology": "Government portal",
        "use": "Health insurance coverage and premium policy",
    },
    {
        "id": "rdb", "tier": 1, "kind": "html",
        "publisher": "Rwanda Development Board", "title": "RDB portal",
        "url": "https://rdb.rw/",
        "data_period": "Current", "geographic_coverage": "Rwanda",
        "measurement_definition": "Investment, enterprise and job-creation context",
        "methodology": "Government portal",
        "use": "Off-farm enterprise and investment context",
    },
    {
        "id": "rura", "tier": 1, "kind": "html",
        "publisher": "Rwanda Utilities Regulatory Authority", "title": "RURA portal",
        "url": "https://www.rura.rw/",
        "data_period": "Current", "geographic_coverage": "Rwanda",
        "measurement_definition": "Energy, water and telecom regulation",
        "methodology": "Regulator portal",
        "use": "Utility tariffs and connectivity context",
    },
]


def load_extra() -> list[dict]:
    """Analyst-registered sources. Tier is forced to 3 unless a reviewer raised it in the file."""
    if not EXTRA_FILE.exists():
        return []
    entries = json.loads(EXTRA_FILE.read_text(encoding="utf-8"))
    accepted = []
    for item in entries:
        required = {"id", "publisher", "title", "url", "use"}
        if not required <= set(item) or urlparse(item["url"]).scheme != "https":
            continue
        accepted.append({"data_period": "Not stated", "geographic_coverage": "Not stated", "measurement_definition": "Not stated",
                         "methodology": "Not reviewed", "kind": "html", **item, "tier": int(item.get("tier", 3))})
    return accepted


def same_site(declared: str, final: str) -> bool:
    """A redirect may change www or the final path but must stay on the declared site."""
    strip = lambda host: (host or "").lower().removeprefix("www.")
    a, b = strip(urlparse(declared).hostname), strip(urlparse(final).hostname)
    return bool(a) and (a == b or a.endswith("." + b) or b.endswith("." + a))
