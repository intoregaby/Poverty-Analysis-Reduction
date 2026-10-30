"""Definition-aware equivalence registry (W7): official-vs-computed comparability is a
reviewed, versioned declaration -- never a hand flag in a claim literal and never inferred
from two numbers being equal."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Equivalence:
    calc_indicator_id: str
    calc_definition_version: str
    official_indicator_id: str
    population: str            # must equal both the calculated sample_unit and the official population
    unit: str
    method_note: str
    approved_by: str           # named reviewer; empty means not approved
    rationale: str


@dataclass
class EquivalenceRegistry:
    entries: list = field(default_factory=list)

    def add(self, eq: Equivalence) -> None:
        if not eq.approved_by or not eq.rationale:
            raise ValueError("equivalence needs a named reviewer and rationale")
        self.entries.append(eq)

    def lookup(self, calc: dict, off: dict):
        for e in self.entries:
            if (e.calc_indicator_id == calc["indicator_id"] and e.calc_definition_version == calc["definition_version"]
                    and e.official_indicator_id == off["indicator_id"]):
                return e
        return None
