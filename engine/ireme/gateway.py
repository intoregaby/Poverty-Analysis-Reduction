"""Single multi-provider AI gateway (EP-09): Groq, NVIDIA, Ollama Cloud, local Ollama.

Enforces, in order: data-sensitivity policy -> capability filter -> benchmark-ranked routing -> bounded
retries/failover honouring Retry-After -> strict output-schema validation -> pinned audit record.
Transport is injected so the same code path runs against live providers and failure-injection fakes.
Secrets are read from the environment at call time only and are redacted from every error/log string.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import time
from dataclasses import dataclass, field, replace
from ipaddress import ip_address
from typing import Callable
from urllib.parse import urlsplit

import yaml
from jsonschema import Draft202012Validator

from .release_gate import POLICY_FILE  # noqa: F401  (policy dir anchor)

ROUTER_POLICY = POLICY_FILE.parent / "ai_router.yaml"

SENSITIVITY = ("public", "restricted_aggregate", "confidential_microdata", "beneficiary_operational", "secrets")
SECRET_PATTERNS = [r"gsk_[A-Za-z0-9]{20,}", r"nvapi-[A-Za-z0-9_\-]{20,}", r"\bsk-[A-Za-z0-9]{20,}",
                   r"eyJ[A-Za-z0-9_\-]{15,}\.[A-Za-z0-9_\-]{15,}\.[A-Za-z0-9_\-]{10,}", r"Bearer\s+[A-Za-z0-9._\-]{16,}",
                   r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['\"]?[A-Za-z0-9._\-]{12,}"]


def redact(text: str, extra_secrets=()) -> str:
    out = str(text)
    for s in extra_secrets:
        if s and len(s) >= 8:
            out = out.replace(s, "[REDACTED]")
    for p in SECRET_PATTERNS:
        out = re.sub(p, "[REDACTED]", out)
    return out


class PolicyDenied(PermissionError):
    pass


class ProviderError(Exception):
    def __init__(self, kind: str, message: str = "", retry_after: float | None = None):
        super().__init__(message or kind)
        self.kind, self.retry_after = kind, retry_after


class GatewayExhausted(RuntimeError):
    def __init__(self, attempts: list):
        super().__init__("all providers exhausted: " + "; ".join(f"{a['provider']}:{a['outcome']}" for a in attempts))
        self.attempts = attempts


def provider_key_names(base: str) -> tuple[str, ...]:
    """Canonical key names for one provider: BASE, BASE_2 ... BASE_9.

    Multiple keys are supported for separate authorized accounts/projects. Extra keys are tried
    only after the previous key/providers fail; they never increase provider-wide quotas.
    """
    return (base, *(f"{base}_{i}" for i in range(2, 10)))


def configured_keys(env: dict, base: str) -> list[str]:
    """Non-empty distinct key values for one provider, in deterministic order (never logged)."""
    out: list[str] = []
    for name in provider_key_names(base):
        value = (env.get(name) or "").strip()
        if value and value not in out:
            out.append(value)
    return out


def has_configured_keys(env: dict) -> bool:
    bases = {p.key_env for p in default_providers().values() if p.key_env}
    return any(configured_keys(env, base) for base in bases)


@dataclass(frozen=True)
class Provider:
    name: str
    base_url: str
    key_env: str | None
    local: bool
    capabilities: frozenset            # subset of {"json_schema","tools","long_context","multilingual"}
    models: tuple = ()


def default_providers() -> dict[str, Provider]:
    pol = yaml.safe_load(ROUTER_POLICY.read_text(encoding="utf-8"))["providers"]
    return {
        "groq": Provider("groq", "https://api.groq.com/openai/v1", "GROQ_API_KEY", False,
                         frozenset({"json_schema", "tools", "multilingual"})),
        "nvidia": Provider("nvidia", "https://integrate.api.nvidia.com/v1", "NVIDIA_API_KEY", False,
                           frozenset({"json_schema", "long_context", "multilingual"})),
        "ollama_cloud": Provider("ollama_cloud", pol["ollama_cloud"]["base_url"], pol["ollama_cloud"]["key_env"], False,
                                 frozenset({"multilingual"})),
        "ollama_local": Provider("ollama_local", pol["ollama_local"]["base_url"], None, True,
                                 frozenset({"multilingual"})),
    }


@dataclass
class Request:
    task: str                        # structured_analysis | source_classification | hypothesis_generation | translation | microdata_processing
    messages: list
    sensitivity: str = "public"
    local_only: bool = False
    needs: frozenset = frozenset()
    schema: dict | None = None
    clearance: str | None = None     # explicit disclosure clearance id for restricted_aggregate data
    model_hint: str | None = None


@dataclass
class Gateway:
    providers: dict
    transport: Callable[[Provider, str, Request, str | None], dict]   # returns {"content": str, "model": str}
    env: dict = field(default_factory=lambda: dict(os.environ))
    sleep: Callable[[float], None] = time.sleep
    clock: Callable[[], float] = time.time
    benchmark: dict = field(default_factory=dict)       # (task, provider) -> score
    cooldown_until: dict = field(default_factory=dict)  # provider -> epoch
    audit: list = field(default_factory=list)
    max_attempts: int = 3
    expand_keys: bool = True

    def __post_init__(self):
        pol = yaml.safe_load(ROUTER_POLICY.read_text(encoding="utf-8"))
        self.policy = pol
        self.max_attempts = pol["retry_policy"]["maximum_total_provider_attempts"]
        self.forbidden = set(pol["remote_data_policy"]["forbidden"])
        self.allowed_remote = set(pol["remote_data_policy"]["allowed_sensitivity"])
        if self.expand_keys:
            expanded = {}
            for provider in self.providers.values():
                expanded[provider.name] = provider
                if not provider.key_env:
                    continue
                for index, name in enumerate(provider_key_names(provider.key_env)[1:], start=2):
                    if (self.env.get(name) or "").strip():
                        expanded[f"{provider.name}#{index}"] = replace(provider, name=f"{provider.name}#{index}",
                                                                       key_env=name)
            self.providers = expanded

    # ---- policy ---------------------------------------------------------------------------------------
    def _secrets(self):
        """Every configured key of every provider, including the `_2.._9` extras, for redaction/leak checks.

        Covers suffixed keys even when `expand_keys=False` (benchmark runs construct single-provider
        gateways without expansion), so no key can appear in a prompt, error string or audit record.
        """
        out: list[str] = []
        for p in self.providers.values():
            if not p.key_env:
                continue
            for value in configured_keys(self.env, p.key_env):
                if value not in out:
                    out.append(value)
        return out

    def _check_payload(self, req: Request):
        if req.sensitivity not in SENSITIVITY:
            raise PolicyDenied(f"unknown sensitivity '{req.sensitivity}'")
        blob = json.dumps(req.messages, ensure_ascii=False)
        if any(re.search(p, blob) for p in SECRET_PATTERNS) or any(s in blob for s in self._secrets()):
            raise PolicyDenied("prompt contains secret-like material")
        if req.sensitivity == "secrets":
            raise PolicyDenied("secrets are never sent to any model")
        if req.sensitivity in self.forbidden and not (req.local_only and req.clearance):
            raise PolicyDenied(f"{req.sensitivity} may only be processed by an explicitly local provider with clearance")
        if req.task == "microdata_processing" and not req.local_only:
            raise PolicyDenied("microdata_processing is never hosted")

    def eligible(self, req: Request) -> list[Provider]:
        self._check_payload(req)
        out = []
        for p in self.providers.values():
            if p.local is False:
                if req.local_only:
                    continue
                if req.sensitivity in self.forbidden or req.sensitivity not in self.allowed_remote:
                    continue
                if req.sensitivity == "restricted_aggregate" and not req.clearance:
                    continue          # require_explicit_disclosure_clearance
                if p.key_env and not self.env.get(p.key_env):
                    continue          # enabled_when_configured
                if urlsplit(p.base_url).scheme != "https":
                    continue
            else:
                host = urlsplit(p.base_url).hostname or ""
                try:
                    if not ip_address(host).is_loopback:
                        continue      # "local" must really be loopback
                except ValueError:
                    if host != "localhost":
                        continue
            need = set(req.needs) | ({"json_schema"} if req.schema else set())
            if not need <= set(p.capabilities):
                continue
            if self.cooldown_until.get(p.name, 0) > self.clock():
                continue
            out.append(p)
        if not out:
            raise PolicyDenied("no provider satisfies privacy, capability and availability constraints")
        return sorted(out, key=lambda p: (-self.benchmark.get((req.task, p.name), 0.0), p.name))

    # ---- execution ------------------------------------------------------------------------------------
    def complete(self, req: Request) -> dict:
        candidates = self.eligible(req)
        attempts = []
        prompt_sha = hashlib.sha256(json.dumps(req.messages, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        schema_sha = hashlib.sha256(json.dumps(req.schema, sort_keys=True).encode()).hexdigest() if req.schema else None
        retryable = set(self.policy["retry_policy"]["retryable"])
        never = set(self.policy["retry_policy"]["never_retry_on"])
        i = 0
        while len(attempts) < self.max_attempts and i < len(candidates):
            p = candidates[i]
            key = self.env.get(p.key_env) if p.key_env else None
            try:
                raw = self.transport(p, p.base_url, req, key)
                content = raw["content"]
                if req.schema:
                    parsed = json.loads(content)
                    errs = [e.message for e in Draft202012Validator(req.schema).iter_errors(parsed)]
                    if errs:
                        attempts.append({"provider": p.name, "outcome": "schema_invalid", "detail": errs[:3]})
                        i += 1
                        continue
                    result = parsed
                else:
                    result = content
                attempts.append({"provider": p.name, "outcome": "ok"})
                rec = {"provider": p.name, "model": raw.get("model"), "task": req.task, "prompt_sha256": prompt_sha,
                       "schema_sha256": schema_sha, "attempts": attempts, "sensitivity": req.sensitivity,
                       "output_sha256": hashlib.sha256(content.encode()).hexdigest(), "local": p.local}
                self.audit.append(rec)
                return {"result": result, "audit": rec}
            except json.JSONDecodeError:
                attempts.append({"provider": p.name, "outcome": "schema_invalid", "detail": ["not JSON"]})
                i += 1
            except ProviderError as e:
                detail = redact(str(e), self._secrets())
                if e.kind in never:
                    raise PolicyDenied(f"{e.kind}: {detail}") from e
                if e.kind in retryable:
                    if e.kind == "transient_429":
                        wait = e.retry_after if e.retry_after is not None else 1.0
                        self.cooldown_until[p.name] = self.clock() + wait
                        attempts.append({"provider": p.name, "outcome": "quota", "retry_after": wait})
                        i += 1          # fail over; do not hammer the same quota
                    else:
                        attempts.append({"provider": p.name, "outcome": e.kind, "detail": detail})
                        i += 1
                    continue
                attempts.append({"provider": p.name, "outcome": f"fatal:{e.kind}", "detail": detail})
                i += 1
        self.audit.append({"task": req.task, "prompt_sha256": prompt_sha, "attempts": attempts, "outcome": "exhausted"})
        raise GatewayExhausted(attempts)


# ---- translation guard (AI-17) ---------------------------------------------------------------------------
_NUM = re.compile(r"\d+(?:[.,]\d+)?")


def numbers_preserved(source: str, translation: str) -> bool:
    norm = lambda s: sorted(x.replace(",", ".") for x in _NUM.findall(s))  # noqa: E731
    return norm(source) == norm(translation)


# ---- benchmark-driven routing (model evaluation) ------------------------------------------------------------
def evaluate_models(gw: Gateway, task: str, cases: list[tuple[Request, Callable[[object], bool]]]) -> dict:
    """Run each provider on benchmark cases; store pass-rate as routing score. Returns per-provider scores."""
    scores = {}
    for name, p in gw.providers.items():
        ok = total = 0
        for req, check in cases:
            try:
                single = Gateway({name: p}, gw.transport, gw.env, gw.sleep, gw.clock, expand_keys=False)
                out = single.complete(req)
                ok += bool(check(out["result"]))
            except (PolicyDenied, GatewayExhausted):
                pass
            total += 1
        if total:
            scores[name] = ok / total
            gw.benchmark[(task, name)] = ok / total
    return scores
