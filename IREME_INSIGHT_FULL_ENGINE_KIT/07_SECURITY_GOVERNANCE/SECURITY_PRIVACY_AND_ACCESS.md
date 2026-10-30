# Security, privacy and disclosure architecture

## Data trust classifications
- **PUBLIC:** published statistical aggregates already cleared for release.
- **RESTRICTED_AGGREGATE:** approved analysis results that still require minimum cell-size, complementary suppression, differencing-risk and export checks.
- **CONFIDENTIAL_MICRODATA:** individual/household source rows, linkage keys and sensitive fields; never enter hosted LLM requests.
- **BENEFICIARY_OPERATIONAL:** named programme records and finance/insurance status, separate lawful purpose and retention rules.
- **SECRETS:** tokens/keys/passwords/certificates, never within AI prompts or client bundle.

## Enforcement model
OIDC-authenticated users with role + attribute policies (district coverage, dataset license, research purpose, report sensitivity and provenance). Authorized export check must run at API and object download, independent of hidden UI elements. Signed object URLs bound to principal, purpose, version and short expiry; revoke/report supersession invalidates public access where possible. Use encryption at rest/in transit, tenant/project boundaries, audit events, least privilege, MFA for privileged actions and no secrets in logs.

## Disclosure safety
Threshold checks, primary/complementary suppression, rare-category review, reconstruction and differencing attack tests (including repeated query budget), geolocation fuzzing at permitted granularity, output rounding policy and manual disclosure control for high-risk public reports. Treat aggregate values as potentially reidentifying under small groups. Log every permitted aggregate export; public dashboards use published release snapshots only.

## Hosted AI policy
Cloud AI may receive only sanitized, approved aggregate facts and allowable public excerpts, after disclosure tests. Do not accidentally proxy cloud requests through local Ollama in 'local-only' mode. Provider usage terms, retention and regional restrictions require documented approval. Prompt injection in source material must not trigger data transfer, secret access or tool execution.

## Secure SDLC and threat modelling
Threats: SSRF through source URL, PDF parser exploit, malicious Excel formula, prompt injection, malicious archive traversal, token theft, report-link bypass, privilege escalation, data poisoning, stale or replayed approvals, CSRF, webhook forgery, DDoS and cross-tenant query leaks. Mitigate with URL allowlist, sandbox parsers, file scanning, safe spreadsheet formula handling, signed artifacts, schema validation, network egress policy, dependency scanning, SAST/DAST, policy unit/integration tests, and incident runbooks.

## Regulatory note
Do not claim Rwanda law compliance from this document alone. Obtain applicable Rwanda data protection/privacy, survey licensing, institutional approvals and cross-border processing legal review before accepting confidential microdata or operational beneficiary records.
