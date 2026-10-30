# Official technical references and verified public source pointers
Checked against current public documentation on **2026-10-30**. These URLs are *implementation references*, not a claim that any source PDF or Excel file is downloaded into this ZIP.

## Rwanda official publications
- NISR EICV7 data-source portal: https://alpha.statistics.gov.rw/data-sources/surveys/EICV/integrated-household-living-conditions-survey-7-eicv-7
- NISR EICV7 Main Indicators page, including published XLSX tables: https://gis.statistics.gov.rw/statistical-publications/poverty-and-social-protection/eicv7-main-indicators-report-202324
- NISR Poverty Profile report and structured reference tables: https://statistics.gov.rw/data-sources/surveys/EICV/integrated-household-living-conditions-survey-7-eicv-7/eicv7-poverty-profile-report-202324
- NISR EICV7 Methodological Notes: https://alpha.statistics.gov.rw/statistical-publications/poverty-and-social-protection/eicv7-methodological-notes

**Scientific warning:** NISR says important poverty measurement methodology changes were introduced for EICV7. Do NOT compare older observed poverty rates directly with EICV7 without validated harmonization or modelled same-method estimates. NISR's national EICV7 poverty rate is 27.4%, but hard-coding this number as a computation 'validator' is not independent verification. Official companion Excel tables are important reference sources.

## Hosted and local LLMs
- Ollama API OpenAI compatibility: https://docs.ollama.com/api/openai-compatibility
- Ollama API authentication: https://docs.ollama.com/api/authentication
- Ollama Cloud docs: https://docs.ollama.com/cloud
- Groq provider rate limits: https://console.groq.com/docs/rate-limits
- Groq projects and organization ceiling: https://console.groq.com/docs/projects
- Provider capability, pricing and model lists may change. Store model capabilities as tested deployment metadata, not timeless constants. Additional keys do not bypass shared organization limits.

## Workflow and AI governance
- Temporal durable workflow overview: https://docs.temporal.io/workflow-execution
- Temporal retry and idempotency semantics: https://docs.temporal.io/nexus/operations
- Temporal workflow determinism: https://docs.temporal.io/workflow-definition
- NIST AI RMF Generative AI Profile: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence

## Legal review reminders
Before ingesting confidential microdata, check survey access licenses, NISR data agreement requirements and applicable Rwandan data protection law and institutional policy. Public documents are not approval to expose individual records to cloud LLMs. Nothing in this package is legal certification or official NISR endorsement.
