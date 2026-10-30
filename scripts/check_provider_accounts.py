"""Live provider-account check: which configured keys authenticate, and whether quota is left.

Reads credential *names* from `.env.local` (or the environment), never prints or stores key values.
For every configured key slot it performs two cheap calls:

1. `GET /models`  -- proves the credential authenticates without spending completion tokens.
2. `POST /chat/completions` with `max_tokens=1` -- proves completion quota/credit still works.

The second call is deliberately minimal and carries only a trivial public prompt; no project data
leaves the machine. Evidence is written without key material so it can be committed.

Exit code: 0 when at least one provider has a working credential, 1 otherwise.
"""
from __future__ import annotations

import json
import os
import socket
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.local"
EVIDENCE = ROOT / "docs" / "implementation" / "evidence" / "provider_credentials.json"

PROVIDERS = {
    "GROQ": {"base": "https://api.groq.com/openai/v1", "models_hint": ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]},
    "NVIDIA": {"base": "https://integrate.api.nvidia.com/v1", "models_hint": ["meta/llama-3.1-8b-instruct", "openai/gpt-oss-20b"]},
    "OLLAMA": {"base": "https://ollama.com/v1", "models_hint": ["gpt-oss:20b", "gpt-oss:120b"]},
}
SLOTS = ("", *[f"_{i}" for i in range(2, 10)])
UA = {"User-Agent": "ireme-credential-check/1.0", "Content-Type": "application/json"}
QUOTA_HEADERS = ("x-ratelimit-remaining-requests", "x-ratelimit-remaining-tokens", "x-ratelimit-limit-requests",
                 "x-ratelimit-reset-requests", "retry-after")
CHAT_TIMEOUT = 30
LIST_TIMEOUT = 20


def load_env() -> dict:
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            text = line.strip()
            if not text or text.startswith("#") or "=" not in text:
                continue
            k, v = text.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    for k, v in os.environ.items():          # process env wins for hosted runs
        if k.endswith("_API_KEY") or "_API_KEY_" in k:
            env.setdefault(k, v)
    return env


def call(method: str, url: str, key: str, body: dict | None = None, timeout: float = LIST_TIMEOUT):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method, headers={**UA, "Authorization": f"Bearer {key}"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()[:500]
    except (socket.timeout, TimeoutError, urllib.error.URLError) as e:
        return None, {}, str(getattr(e, "reason", e))[:200]


def quota_view(headers: dict) -> dict:
    lower = {k.lower(): v for k, v in headers.items()}
    return {h: lower[h] for h in QUOTA_HEADERS if h in lower}


def pick_model(models: list[str], hints: list[str]) -> str | None:
    for h in hints:
        if h in models:
            return h
    for m in models:
        if m and not any(w in m.lower() for w in ("embed", "rerank", "guard")):
            return m
    return None


def probe_provider(name: str, base: str, key: str) -> dict:
    out: dict = {"models_http": None, "models": 0, "chat_http": None, "verdict": "UNKNOWN", "quota": {}}
    status, headers, body = call("GET", base.rstrip("/") + "/models", key)
    out["models_http"] = status
    out["quota"] = quota_view(headers)
    if status is None:
        out["verdict"] = "UNREACHABLE"
        out["detail"] = str(body)[:160]
        return out
    if status in (401, 403):
        out["verdict"] = "KEY_REJECTED"
        return out
    if status == 429:
        out["verdict"] = "RATE_LIMITED"
        return out
    if status != 200:
        out["verdict"] = f"HTTP_{status}"
        return out
    try:
        models = [m["id"] for m in json.loads(body).get("data", [])]
    except (ValueError, KeyError, TypeError):
        models = []
    out["models"] = len(models)
    if not models:
        out["verdict"] = "NO_MODELS"
        return out

    model = pick_model(models, PROVIDERS[name]["models_hint"])
    if not model:
        out["verdict"] = "NO_CHAT_MODEL"
        return out
    out["model"] = model
    body_req = {"model": model, "messages": [{"role": "user", "content": "Reply with: ok"}],
                "max_tokens": 1, "temperature": 0}
    cstatus, cheaders, cbody = call("POST", base.rstrip("/") + "/chat/completions", key, body_req, CHAT_TIMEOUT)
    out["chat_http"] = cstatus
    out["quota"] = quota_view(cheaders) or out["quota"]
    if cstatus == 200:
        out["verdict"] = "CREDIT_OK"
    elif cstatus == 429:
        out["verdict"] = "QUOTA_EXHAUSTED"
    elif cstatus in (401, 403):
        out["verdict"] = "KEY_REJECTED"
    elif cstatus == 402:
        out["verdict"] = "PAYMENT_REQUIRED"
    elif cstatus is None:
        out["verdict"] = "UNREACHABLE"
    else:
        out["verdict"] = f"CHAT_HTTP_{cstatus}"
        try:
            out["detail"] = json.loads(cbody).get("error", {}).get("message", "")[:200]
        except (ValueError, AttributeError):
            pass
    return out


def main() -> int:
    env = load_env()
    report: dict = {"checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "providers": {}}
    working = 0
    for name, cfg in PROVIDERS.items():
        entries = []
        for slot in SLOTS:
            key = env.get(f"{name}_API_KEY{slot}")
            if not key:
                continue
            result = probe_provider(name, cfg["base"], key)
            result["slot"] = slot or "_1"
            result.pop("models", None) if False else None
            # keep model counts and statuses only; never model text, never the key
            entries.append(result)
            if result["verdict"] == "CREDIT_OK":
                working += 1
            print(f"{name}{slot or '_1':>3}: {result['verdict']:<17} models={result.get('models', 0):<4} "
                  f"quota={result.get('quota') or '-'}")
        if entries:
            report["providers"][name] = entries

    EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE.write_text(json.dumps(report, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(f"\nworking credentials: {working}; evidence -> {EVIDENCE.relative_to(ROOT)} (no key material)")
    return 0 if working else 1


if __name__ == "__main__":
    sys.exit(main())
