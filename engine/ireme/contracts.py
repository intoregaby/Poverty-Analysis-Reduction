"""Loads and enforces the kit's JSON Schema contracts (Draft 2020-12)."""
from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from pathlib import Path

from jsonschema import Draft202012Validator

KIT = Path(__file__).resolve().parents[2] / "IREME_INSIGHT_FULL_ENGINE_KIT" / "09_MACHINE_CONTRACTS"
SCHEMA_DIR = KIT / "schemas"


class ContractViolation(ValueError):
    def __init__(self, schema: str, errors: list[str]):
        super().__init__(f"{schema}: " + "; ".join(errors))
        self.schema, self.errors = schema, errors


@lru_cache(maxsize=None)
def _validator(name: str) -> Draft202012Validator:
    schema = json.loads((SCHEMA_DIR / f"{name}.schema.json").read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def validate(name: str, obj: dict) -> dict:
    try:
        json.dumps(obj, allow_nan=False)
    except (TypeError, ValueError) as error:
        raise ContractViolation(name, ['Contract requires finite JSON values: ' + str(error)]) from error
    errs = sorted(f"{'/'.join(map(str, e.absolute_path)) or '<root>'}: {e.message}" for e in _validator(name).iter_errors(obj))
    if errs:
        raise ContractViolation(name, errs)
    return obj


def canonical_hash(obj) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()).hexdigest()
