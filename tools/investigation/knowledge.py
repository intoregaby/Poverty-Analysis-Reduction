"""Reviewable library linking each measured factor group to a mechanism hypothesis and the evidence needed.

Nothing here is a finding. Entries are hypotheses to test, written so that an analyst can see what would
confirm them, what response families exist to evaluate and which registered sources to read.
Response families are options for research. None is recommended without local feasibility and impact evidence.
"""

LIBRARY = {
    "household_structure": {
        "mechanism": "More dependants per working-age adult lowers consumption per adult equivalent, so households near the poverty line fall below it.",
        "confirm_with": ["Age and work composition of poor households (dependants per earner)", "Childcare and school-feeding availability for working adults", "Whether poor large households are labour-constrained"],
        "response_families": ["Support for labour-constrained households (compare VUP Direct Support targeting)", "Services that free adult time for work (childcare, school feeding)", "Health and family-planning services"],
        "evidence_needed": "Programme evaluations and local targeting data",
        "sources": ["eicv7-vup", "unicef-rwanda", "eicv7-poverty"],
    },
    "household_head": {
        "mechanism": "Heads with little schooling or female-headed households may face weaker access to land, credit and well-paid work.",
        "confirm_with": ["Land and asset ownership by head's sex (not in the supplied survey modules)", "Credit access by head's sex (FinScope, not record-linked)", "Whether female heads are widowed, single or supported by absent earners"],
        "response_families": ["Access to productive assets and finance for women-led households", "Adult literacy and skills training"],
        "evidence_needed": "Impact evaluations of asset, finance and literacy programmes",
        "sources": ["jpal-rwanda", "minecofin", "worldbank-rwanda"],
    },
    "education": {
        "mechanism": "Adult literacy and secondary schooling raise the chance of wage work and better farm and business returns, and children who are out of school may carry the disadvantage forward, but effects build slowly.",
        "confirm_with": ["Returns to schooling in the local labour market", "Availability of TVET and adult training near poor households", "Why children aged 6–15 are out of school here (cost, distance, work) and adult literacy course coverage"],
        "response_families": ["TVET and skills programmes linked to local employers", "Adult literacy courses", "Support for keeping children in school"],
        "evidence_needed": "Evidence that training leads to jobs in the district's labour market",
        "sources": ["mineduc", "rdb", "jpal-rwanda"],
    },
    "livelihood": {
        "mechanism": "Households with no non-farm wage or business income depend on farm output and weather, leaving little buffer. Few off-farm jobs keeps consumption low, and households that rely on daily or casual work, or on unpaid family work, are more exposed to gaps in income.",
        "confirm_with": ["Off-farm job and business opportunities within reach (market towns, employers)", "Whether daily and casual work is regular enough to cover basic needs", "Farm size, yields and crop prices (not validated here)", "Participation and results of public works and financial-service programmes"],
        "response_families": ["Public works and off-farm job creation", "Enterprise and financial-service support", "Agricultural productivity and market-access support"],
        "evidence_needed": "Impact evaluations and local labour-market study",
        "sources": ["eicv7-vup", "minagri", "rdb", "jpal-rwanda", "fao-giews-rwanda"],
    },
    "remittances": {
        "mechanism": "Money from relatives outside the household smooths consumption; fewer recipients leaves households more exposed.",
        "confirm_with": ["Value and regularity of transfers", "Mobile-money and agent access"],
        "response_families": ["Mobile-money and financial-service access"],
        "evidence_needed": "Transfer amounts and agent coverage data",
        "sources": ["worldbank-rwanda", "rura"],
    },
    "finance": {
        "mechanism": "Without an account, savings or credit, households cannot smooth shocks or invest in farms and businesses. A refused loan or heavy debt points to constrained access.",
        "confirm_with": ["Local branch, agent and SACCO coverage", "Reasons for refused loans (collateral, income) among poor households", "Whether tontines substitute for formal savings"],
        "response_families": ["Mobile-money and savings-group access", "Credit products for farm and small-business households"],
        "evidence_needed": "FinScope district estimates and financial-institution coverage data; impact evidence on credit and savings programmes",
        "sources": ["jpal-rwanda", "worldbank-rwanda", "rura"],
    },
    "services_access": {
        "mechanism": "Long travel to markets, transport and health care raises the cost of selling produce, finding work and treating illness.",
        "confirm_with": ["Road condition and transport availability (district engineering records)", "Market days and prices", "Health-centre catchment and staffing"],
        "response_families": ["Rural roads and market-access investments", "Mobile health and outreach services"],
        "evidence_needed": "Spatial access data and cost estimates",
        "sources": ["minagri", "moh", "afdb-rwanda"],
    },
    "durables": {
        "mechanism": "Owning fewer durable goods and no vehicle mostly reflects low wealth, and durable goods are partly counted inside the consumption measure that defines poverty. Read as a sign of deprivation, not a cause.",
        "confirm_with": ["Use only to validate targeting and monitor progress"],
        "response_families": [],
        "evidence_needed": "Not applicable as a driver",
        "sources": ["eicv7-main"],
    },
    "energy": {
        "mechanism": "Without grid power or clean cooking, households spend time and money on fuel and cannot run small businesses or study after dark. Cooking fuel also tracks wealth, so part of the link reflects poverty causing fuel choice.",
        "confirm_with": ["Grid reach and connection costs by sector (utility records)", "Affordability of connection fees and tariffs", "Share of firewood bought versus collected"],
        "response_families": ["Connection support where the grid is near", "Off-grid solar where it is not", "Clean or improved cooking solutions"],
        "evidence_needed": "Utility connection data, cost studies and impact evidence on energy access",
        "sources": ["eicv7-utilities", "rura", "worldbank-wdi"],
    },
    "water_sanitation": {
        "mechanism": "Distant or unsafe water costs time and health; unimproved sanitation raises illness and care costs.",
        "confirm_with": ["Water point functionality and distance (utility and district records)", "Seasonal water availability", "Health-cost data in affected sectors"],
        "response_families": ["Water point construction and rehabilitation", "Sanitation facilities"],
        "evidence_needed": "Local infrastructure inventory and cost estimates",
        "sources": ["eicv7-utilities", "rura", "unicef-rwanda"],
    },
    "health": {
        "mechanism": "Illness or disability reduces earning and raises care costs; uninsured members pay out of pocket.",
        "confirm_with": ["Insurance category and premium arrears (RSSB records)", "Out-of-pocket costs of poor households", "Disability support available locally"],
        "response_families": ["Premium support for insurance coverage", "Disability-inclusive livelihood support"],
        "evidence_needed": "Administrative insurance data and cost studies",
        "sources": ["rssb", "moh", "dhs-rwanda"],
    },
    "shocks": {
        "mechanism": "Drought, floods, illness or price spikes force asset sales and cut consumption.",
        "confirm_with": ["Type, timing and recovery of shocks reported locally", "Weather and food-price records", "Whether affected households had insurance or savings"],
        "response_families": ["Shock-responsive support and savings or insurance schemes"],
        "evidence_needed": "Local shock history and recovery evidence",
        "sources": ["fao-giews-rwanda", "wfp-rwanda", "afdb-rwanda"],
    },
    "location": {
        "mechanism": "Rural households may be far from markets and jobs. The adjusted figure shows what rurality adds after the other measured factors are held fixed.",
        "confirm_with": ["Travel time to markets and employers", "Road and transport conditions"],
        "response_families": ["Market-access and rural-roads investments"],
        "evidence_needed": "Spatial access data",
        "sources": ["minagri", "worldbank-rwanda", "afdb-rwanda"],
    },
    "connectivity": {
        "mechanism": "Phone and internet ownership mostly signals household wealth, so it is read as a sign of deprivation rather than a lever.",
        "confirm_with": ["Use only to validate targeting and monitor progress"],
        "response_families": [],
        "evidence_needed": "Not applicable as a driver",
        "sources": ["rura"],
    },
    "housing_assets": {
        "mechanism": "Earth floors and no livestock reflect accumulated poverty, so they are signs of deprivation, not causes.",
        "confirm_with": ["Use only to validate targeting and monitor progress"],
        "response_families": [],
        "evidence_needed": "Not applicable as a driver",
        "sources": ["eicv7-main"],
    },
}
