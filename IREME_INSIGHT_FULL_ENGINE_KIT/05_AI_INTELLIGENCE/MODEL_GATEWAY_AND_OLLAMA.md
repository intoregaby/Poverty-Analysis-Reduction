# Multi-provider AI gateway — Groq, NVIDIA, Ollama Cloud, local Ollama

## Model and key configuration
Use a **backend-only** secret manager or environment injection; never commit live keys, pass them to React, print them or persist them in plain audit logs. Keep provider adapters with centrally enforced timeouts, quotas, budget, capability checks and output schemas.

| Provider | Auth / endpoint contract | Important caveat |
|---|---|---|
| Groq | official OpenAI-compatible API and project key | organization-level limits apply; extra keys do not manufacture quota |
| NVIDIA | model-specific hosted API; verify at deployment | model availability, data handling and terms vary; no hardcoded model guarantee |
| Ollama Cloud | `https://ollama.com/v1`, `Authorization: Bearer` API key | confirm model ID and supported endpoints dynamically |
| Local Ollama | `http://127.0.0.1:11434/v1` when running locally | local API generally unauthenticated; restrict bind address/firewall; cloud models through local proxy must not be mistaken for local-only processing |

Authoritative Ollama API guidance: https://docs.ollama.com/api/openai-compatibility and https://docs.ollama.com/api/authentication. Cloud API requires a real API key, while OpenAI SDK connections to a local Ollama server may use an ignored placeholder value. Cloud API is only a subset of OpenAI behavior: feature-capability probes are mandatory.

## Allowed model tasks and preference
- `structured_analysis`: only aggregate/suppression-checked facts; use strongest benchmarked model for strict schema accuracy.
- `source_classification`: public documents only, constrained output, no official-truth assignment by model.
- `hypothesis_generation`: aggregate evidence plus limitations, retrievable candidate hypotheses only.
- `translation`: finalized numeric claims rendered from facts; back-translation/quality review of meaning.
- `microdata_processing`: **never hosted**; use deterministic code or approved strictly local execution with data safeguards if necessary.

## Routing policy, in order
1. Enforce data category and authorization before any payload leaves the trusted environment.
2. Determine capability requirements: context, structured JSON, language, vision, latency, tool protocol, residency, privacy, cost.
3. Filter by verified provider policy and supported features; never assume universal support because endpoint resembles OpenAI.
4. Apply empirical task-specific quality benchmarks and availability checks; record chosen version and reason.
5. Rate-limit by real provider/organization quota, respecting 429/Retry-After; do not bypass quotas by rotating keys from the same owner.
6. Call model with bounded retries, jitter, circuit breaker, context limits and graceful degradation.
7. Validate schema and claim bindings; if invalid, retry within budget with structured diagnostics; never accept hallucinated numbers.
8. Exhaustion -> restricted draft with reason, deterministic evidence summary, or human review.

## Operational security
- Cloud endpoints must be outbound-allowlisted and use TLS verification, not disabled certificate checks.
- Local Ollama processes must be restricted to host or authenticated proxy; local server access should not be exposed publicly.
- Secret rotation and revocation, usage audit, cost caps, model deprecation checks and scheduled benchmarks are required.
- Only cloud-approved **aggregate** values with permitted precision and safe group sizes are transmitted. Suppress row-like data, identifiers, small-cell reconstructions, rare-category combinations and user uploads until reviewed.
- Never claim an external provider has zero retention or unrestricted data residency without verifying its current contract.
