"""Checks that each configured AI key works and shows its remaining rate limit.

Sends only the message "Reply with OK". No survey figures leave the laptop and the keys are never printed.
Run:  .venv\\Scripts\\python.exe -m tools.investigation.check_ai
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from . import ai

LIMIT_HEADERS = ("x-ratelimit-remaining-requests", "x-ratelimit-remaining-tokens", "x-ratelimit-reset-requests", "x-ratelimit-reset-tokens", "retry-after")


def check(provider: dict) -> None:
    body = {"model": provider["model"], "max_completion_tokens": 20, "temperature": 0, "messages": [{"role": "user", "content": "Reply with OK"}], **provider.get("extra", {})}
    if provider["reasoning"]:
        body["reasoning_effort"] = "low"
    request = Request(provider["url"], data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "Authorization": f"Bearer {provider['key']}", "User-Agent": "NISR-Track2-Investigation/1.0"}, method="POST")
    try:
        with urlopen(request, timeout=30) as response:
            headers, status = response.headers, f"WORKING (HTTP {response.status})"
    except HTTPError as error:
        headers = error.headers
        status = {401: "KEY REJECTED (HTTP 401): the key is wrong or was rotated", 403: "ACCESS DENIED (HTTP 403)", 429: "RATE LIMITED (HTTP 429): not reset yet, wait and try again"}.get(error.code, f"ERROR (HTTP {error.code})")
    except (URLError, TimeoutError) as error:
        print(f"{provider['name']}: NO ANSWER ({type(error).__name__})")
        return
    print(f"{provider['name']}: {status}")
    for name in LIMIT_HEADERS:
        if headers.get(name):
            print(f"  {name}: {headers.get(name)}")


def main() -> int:
    ai.load_env_file(Path(__file__).resolve().parents[2] / ".env.local")
    providers = ai.providers_from_env()
    if not providers:
        print("No key found. Add GROQ_API_KEY (and optionally NVIDIA_API_KEY) to .env.local.")
        return 1
    for provider in providers:
        check(provider)
    return 0


if __name__ == "__main__":
    sys.exit(main())
