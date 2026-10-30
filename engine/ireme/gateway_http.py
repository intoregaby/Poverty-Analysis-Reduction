"""Live OpenAI-compatible transport for the gateway (Groq, NVIDIA, Ollama Cloud, local Ollama).
TLS verification is always on; the API key is only placed in the Authorization header."""
from __future__ import annotations

import json
import socket
import urllib.error
import urllib.request

from .gateway import Provider, ProviderError, Request, redact

# Preference order only; availability is discovered from the provider's /models endpoint at run time
# (model catalogues change: static IDs went stale during development -- NVIDIA answered 410 Gone).
MODEL_PREFERENCES = {
    "groq": ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"],
    "nvidia": ["mistralai/mistral-large-2-instruct", "nvidia/llama-3.1-nemotron-70b-instruct", "openai/gpt-oss-20b"],
    "ollama_cloud": ["gpt-oss:120b", "gpt-oss:20b"],
    "ollama_local": ["llama3.2", "qwen2.5", "gpt-oss:20b"],
}
UA = {"User-Agent": "ireme-engine/0.1"}
_model_cache: dict = {}


def provider_base_name(provider: Provider) -> str:
    """`groq#2` is the same provider behind a second credential, so it shares the model list."""
    return provider.name.split("#", 1)[0]


def list_models(provider: Provider, key: str | None, timeout: float = 20.0) -> list[str]:
    h = dict(UA)
    if provider.key_env:
        h["Authorization"] = f"Bearer {key}"
    try:
        with urllib.request.urlopen(urllib.request.Request(provider.base_url.rstrip("/") + "/models", headers=h),
                                    timeout=timeout) as r:
            return [m["id"] for m in json.loads(r.read())["data"]]
    except urllib.error.HTTPError as e:
        raise ProviderError(f"http_{e.code}", f"model list: HTTP {e.code}") from None
    except (socket.timeout, TimeoutError, urllib.error.URLError):
        raise ProviderError("connection_timeout", "model list unreachable") from None


def _probe(provider: Provider, key: str | None, model: str, timeout: float | None = None) -> bool:
    """Listing is not availability (NVIDIA lists models whose functions 404 for this account): do a 1-token call.

    Local models are loaded from disk on first use, which routinely takes longer than a remote call;
    a 30 s budget made every cold local model look unavailable.
    """
    timeout = timeout or (120.0 if provider.local else 30.0)
    body = {"model": model, "messages": [{"role": "user", "content": "ok"}], "max_tokens": 16, "temperature": 0}
    h = {"Content-Type": "application/json", **UA}
    if provider.key_env:
        h["Authorization"] = f"Bearer {key}"
    for _ in range(2):                      # one retry for 5xx/429/timeouts; other 4xx is final
        try:
            with urllib.request.urlopen(urllib.request.Request(provider.base_url.rstrip("/") + "/chat/completions",
                                        data=json.dumps(body).encode(), headers=h), timeout=timeout):
                return True
        except urllib.error.HTTPError as e:
            if e.code < 500 and e.code != 429:
                return False
        except Exception:  # noqa: BLE001
            pass
    return False


def pick_model(provider: Provider, key: str | None) -> str:
    if provider.name not in _model_cache:
        available = set(list_models(provider, key))
        for pref in MODEL_PREFERENCES.get(provider_base_name(provider), []):
            model = matched_model(available, pref)
            if model and _probe(provider, key, model):
                _model_cache[provider.name] = model
                break
        else:
            raise ProviderError("no_supported_model", f"no preferred model is invocable on {provider.name}")
    return _model_cache[provider.name]


def matched_model(available: set, preference: str) -> str | None:
    """Resolve a preference against the catalogue: exact id, or the same model under an Ollama tag.

    Ollama's OpenAI-compatible catalogue lists `llama3.2:latest`/`llama3.2:1b` while the policy names
    the untagged model, so exact matching alone made every local model look unavailable.
    """
    if preference in available:
        return preference
    tagged = sorted(a for a in available if a.startswith(preference + ":"))
    return tagged[0] if tagged else None


def http_transport(provider: Provider, base_url: str, req: Request, key: str | None, timeout: float = 45.0,
                   model: str | None = None) -> dict:
    if provider.local and timeout < 45.0:
        timeout = 45.0
    if provider.local:
        timeout = max(timeout, 180.0)       # CPU inference starts cold and is far slower than a hosted call
    model = model or req.model_hint or pick_model(provider, key)
    body = {"model": model, "messages": req.messages, "temperature": 0, "max_tokens": 1500}
    if req.schema:
        body["response_format"] = {"type": "json_object"}
    headers = {"Content-Type": "application/json", **UA}
    if provider.key_env:
        headers["Authorization"] = f"Bearer {key}"
    r = urllib.request.Request(base_url.rstrip("/") + "/chat/completions", data=json.dumps(body).encode(),
                               headers=headers, method="POST")
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            data = json.loads(resp.read())
        return {"content": data["choices"][0]["message"]["content"], "model": data.get("model", model)}
    except urllib.error.HTTPError as e:
        retry_after = None
        try:
            retry_after = float(e.headers.get("Retry-After")) if e.headers.get("Retry-After") else None
        except ValueError:
            pass
        detail = redact(e.read()[:300].decode("utf-8", "replace"), [key])
        kind = {429: "transient_429", 502: "transient_502", 503: "transient_503"}.get(e.code, f"http_{e.code}")
        raise ProviderError(kind, f"HTTP {e.code}: {detail}", retry_after) from None
    except (socket.timeout, TimeoutError):
        raise ProviderError("connection_timeout", "timeout") from None
    except urllib.error.URLError as e:
        raise ProviderError("connection_timeout", redact(str(e.reason), [key])) from None
