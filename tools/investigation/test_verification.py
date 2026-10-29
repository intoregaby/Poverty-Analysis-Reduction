"""Tests for the official-evidence verification. The Rusizi report is the main regression case."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.investigation import verification as v

CACHE = Path(__file__).resolve().parents[2] / "investigations" / "source-cache"
LF = chr(10)


def table_text(*pages: list[str]) -> str:
    """Pages joined the way the engine caches extracted PDF text."""
    return (LF + chr(12) + LF).join(LF.join(page) for page in pages)


def fake_source(directory: str, name: str, pages: list[list[str]], source_id: str = "eicv7-main") -> dict:
    pdf = Path(directory) / f"{name}.pdf"
    pdf.write_bytes(b"%PDF-1.4")
    pdf.with_suffix(".txt").write_text(table_text(*pages), encoding="utf-8")
    return {"id": source_id, "status": "Completed", "title": "Test report", "publisher": "NISR", "url": "https://example.test/report.pdf", "local_cache": str(pdf),
            "version": "abcdef1234567890", "retrieved_at": "2026-10-29T09:00:00+00:00"}


ROW = "{:<12} {:>8} {:>8} {:>8} {:>8} {:>8} {:>8}"
HEADER = ["MAIN INDICATORS", "Report", "EICV7", "{page}"]


def page(printed: str, *lines: str) -> list[str]:
    return [line.replace("{page}", printed) for line in HEADER] + list(lines)


class TableLookupTests(unittest.TestCase):
    def test_a_row_is_found_after_the_title_across_a_page_break_and_the_contents_page_is_skipped(self):
        with tempfile.TemporaryDirectory() as directory:
            source = fake_source(directory, "doc", [
                page("2", "Table A9.23: Headcount Poverty rate (%) by district"),                      # contents page: a title, no rows
                page("9", "Table A9.23: Headcount Poverty rate (%) by district", ROW.format("Rwanda", 27.4, 0.5, 26.4, 28.3, 1.8, 1.9)),
                page("10", ROW.format("Rusizi", 44.16, 3.43, 37.43, 50.9, 7.8, 2.1)),
                page("11", "Table A9.24: Something else", ROW.format("Rusizi", 1.0, 1.0, 1.0, 1.0, 1.0, 1.0)),
            ])
            row = v.find_row(source, "A9.23", "Rusizi", v.MAIN_COLUMNS)
            self.assertEqual((row["value"], row["standard_error"], row["lower"], row["upper"]), (44.16, 3.43, 37.43, 50.9))
            self.assertEqual((row["pdf_page"], row["printed_page"]), (3, "10"))

    def test_a_row_that_belongs_to_the_next_table_is_not_returned(self):
        with tempfile.TemporaryDirectory() as directory:
            source = fake_source(directory, "doc", [page("9", "Table A9.23: Headcount", ROW.format("Rwanda", 27.4, 0.5, 26.4, 28.3, 1.8, 1.9), "Table A9.24: Other", ROW.format("Rusizi", 9.9, 1.0, 8.0, 10.0, 1.0, 1.0))])
            self.assertIsNone(v.find_row(source, "A9.23", "Rusizi", v.MAIN_COLUMNS))

    def test_table_titles_with_a_space_in_the_number_are_found(self):
        with tempfile.TemporaryDirectory() as directory:
            source = fake_source(directory, "doc", [page("79", "Table 9. 1: Headcount poverty rate (%)-EICV7 (2023-24)", "Rwanda 27.4 0.5 26.4 28.3 1.8 1.9")])
            self.assertEqual(v.find_row(source, "9.1", "Rwanda", v.MAIN_COLUMNS)["value"], 27.4)


META = {"period": "2023/24", "denominator": "people", "unit": "percent of people", "geography": "district", "definition": "internal definition"}


def published(value, **changes):
    base = {"source": "eicv7-main", "table": "A9.23", "value": value, "period": "2023/24", "denominator": "people", "unit": "percent of people", "geography": "district", "same_concept": True,
            "definition": "published definition", "row": {"pdf_page": 109}}
    return {**base, **changes}


class DecisionTests(unittest.TestCase):
    def test_a_matching_estimate_is_verified_but_the_note_says_only_the_value_was_confirmed(self):
        outcome = v.decide(44.2, META, [published(44.16)])
        self.assertEqual(outcome["status"], v.STATUS_VERIFIED)
        self.assertIn("does not independently validate", outcome["notes"][0])

    def test_a_real_difference_is_a_discrepancy_and_the_internal_value_is_not_touched(self):
        outcome = v.decide(40.0, META, [published(44.16)])
        self.assertEqual(outcome["status"], v.STATUS_DISCREPANCY)
        self.assertEqual(outcome["difference"], -4.16)
        self.assertIn("was not changed", outcome["notes"][0])

    def test_a_different_survey_year_is_a_mismatch_not_an_error(self):
        outcome = v.decide(44.2, META, [published(59.5, period="2016/17")])
        self.assertEqual(outcome["status"], v.STATUS_MISMATCH)
        self.assertIn("Different survey period", " ".join(outcome["notes"]))

    def test_an_incompatible_definition_is_a_mismatch_even_when_the_values_differ_a_lot(self):
        outcome = v.decide(66.0, META, [published(78.85, same_concept=False, definition="main source of lighting")])
        self.assertEqual(outcome["status"], v.STATUS_MISMATCH)
        self.assertFalse(outcome["comparable"])
        self.assertIn("not a like-for-like comparison", " ".join(outcome["notes"]))

    def test_a_different_denominator_is_a_mismatch(self):
        outcome = v.decide(44.2, META, [published(44.2, denominator="households")])
        self.assertEqual(outcome["status"], v.STATUS_MISMATCH)
        self.assertIn("denominator", " ".join(outcome["notes"]))

    def test_conflicting_official_publications_are_flagged_for_review(self):
        outcome = v.decide(72.0, META, [published(72.0), published(72.6, source="eicv7-utilities", table="B.7")])
        self.assertEqual(outcome["status"], v.STATUS_DISCREPANCY)
        self.assertIn("disagree with each other", outcome["notes"][0])

    def test_publications_that_agree_within_rounding_are_not_a_conflict(self):
        self.assertEqual(v.decide(72.0, META, [published(72.02), published(72.0, source="eicv7-utilities")])["status"], v.STATUS_VERIFIED)

    def test_no_published_value_means_not_externally_verified(self):
        self.assertEqual(v.decide(16.4, META, [])["status"], v.STATUS_UNVERIFIED)
        self.assertEqual(v.decide(None, META, [published(1.0)])["status"], v.STATUS_UNVERIFIED)


class SourceAvailabilityTests(unittest.TestCase):
    CLAIM = v.CLAIMS[0]

    def test_an_unavailable_source_is_never_reported_as_verified(self):
        records = {"sources": [{"id": "eicv7-main", "status": "Failed", "error": "Network unreachable", "title": "EICV7 Main Indicators", "url": "https://example.test"}]}
        entry = v.check_claim(self.CLAIM, "Rusizi", {"poverty": 44.2}, {"poverty": 27.4}, records, [])
        self.assertEqual(entry["verification_status"], v.STATUS_UNVERIFIED)
        self.assertIsNone(entry["published_value"])
        self.assertIsNone(entry["source_page_or_table"])
        self.assertIn("could not be retrieved", entry["verification_notes"])

    def test_a_document_without_the_district_row_is_not_verified(self):
        with tempfile.TemporaryDirectory() as directory:
            source = fake_source(directory, "doc", [page("9", "Table A9.23: Headcount", ROW.format("Rwanda", 27.4, 0.5, 26.4, 28.3, 1.8, 1.9))])
            entry = v.check_claim(self.CLAIM, "Rusizi", {"poverty": 44.2}, {}, {"sources": [source]}, [])
            self.assertEqual(entry["verification_status"], v.STATUS_UNVERIFIED)
            self.assertIn("has no row for Rusizi", entry["verification_notes"])

    def test_citation_fields_come_from_the_retrieved_document_and_never_from_guesses(self):
        with tempfile.TemporaryDirectory() as directory:
            source = fake_source(directory, "doc", [page("9", "Table A9.23: Headcount", "Rusizi 44.16 3.43 37.43 50.9 7.8 2.1")])
            entry = v.check_claim(self.CLAIM, "Rusizi", {"poverty": 44.2}, {}, {"sources": [source]}, [])
            self.assertEqual(entry["verification_status"], v.STATUS_VERIFIED)
            self.assertEqual((entry["source_url"], entry["retrieved_at"], entry["source_version"]), ("https://example.test/report.pdf", "2026-10-29T09:00:00+00:00", "abcdef123456"))
            self.assertEqual(entry["source_page_or_table"], "Table A9.23, PDF page 1 (printed page 9)")


class MethodsReviewTests(unittest.TestCase):
    DRIVERS = {"district": "Rusizi", "gap_points": 16.8, "explained_points": 5.0, "unexplained_points": 11.8, "explained_excl_markers_points": 2.0,
               "groups": [{"contribution_points": 3.0}, {"contribution_points": 2.0}], "model": {"bootstrap_replicates": 300, "seed": 20240117, "weighted_r_squared": 0.25}}

    def test_a_consistent_decomposition_passes_and_states_its_assumptions(self):
        review = v.methods_review(self.DRIVERS, {})["decomposition"]
        self.assertEqual(review["status"], "Completed")
        self.assertTrue(all(item["passed"] for item in review["checks"]))
        self.assertTrue(any("Rwanda is the reference group" in text for text in review["assumptions"]))
        self.assertIn("seed 20240117", review["reproduce"])

    def test_an_inconsistent_decomposition_needs_review_and_blocks_the_summary(self):
        review = v.methods_review({**self.DRIVERS, "unexplained_points": 9.0}, {})
        self.assertEqual(review["decomposition"]["status"], "Needs review")
        self.assertIn("decomposition", v.summarize([], review)["unresolved_items"])

    def test_a_missing_seed_is_not_reproducible(self):
        review = v.methods_review({**self.DRIVERS, "model": {"bootstrap_replicates": 300, "seed": None, "weighted_r_squared": 0.25}}, {})["decomposition"]
        self.assertEqual(review["status"], "Needs review")


@unittest.skipUnless((CACHE / "eicv7-main.json").exists() and any(CACHE.glob("eicv7-main-*.txt")), "the NISR documents have not been retrieved on this machine")
class RusiziRegressionTests(unittest.TestCase):
    """Values exactly as printed in the supplied Rusizi report, checked against the real cached NISR publications."""

    @classmethod
    def setUpClass(cls):
        records = {"sources": [json.loads(path.read_text(encoding="utf-8")) for path in CACHE.glob("*.json")]}
        district = {"district": "Rusizi", "poverty": 44.2, "extreme_poverty": None, "grid_connection": 66.0, "health_insurance": 78.1, "vup_among_poor": 16.4, "sample_households": 486}
        national = {"poverty": 27.4, "extreme_poverty": 5.4, "grid_connection": 50.8, "health_insurance": 85.3}
        analysis = {"comparison": {"district": district, "national": national}, "contextual_analysis": {"selected_poverty_se_points": 3.43, "published_se_points": 3.43}}
        findings = {"findings": [
            {"id": "poverty", "value": 44.2, "national": 27.4}, {"id": "grid_connection", "value": 66.0, "national": 50.8},
            {"id": "health_insurance", "value": 78.1, "national": 85.3}, {"id": "vup_among_poor", "value": 16.4, "national": 15.9}]}
        cls.result = v.verify_evidence("Rusizi", analysis, None, findings, records)
        cls.by_id = {item["indicator_id"]: item for item in cls.result["registry"]}

    def test_poverty_rates_match_the_published_tables_and_are_cited_with_page_and_table(self):
        district, national = self.by_id["poverty_headcount"], self.by_id["poverty_headcount_national"]
        self.assertEqual(district["verification_status"], v.STATUS_VERIFIED)
        self.assertEqual((district["published_value"], national["published_value"]), (44.16, 27.4))
        self.assertIn("Table A9.23", district["source_page_or_table"])
        self.assertIn("Table 9.1", national["source_page_or_table"])
        self.assertTrue(district["source_url"].startswith("https://statistics.gov.rw/"))
        self.assertTrue(district["retrieved_at"])

    def test_the_published_interval_and_the_survey_design_are_verified(self):
        entry = self.by_id["poverty_headcount_standard_error"]
        self.assertEqual(entry["verification_status"], v.STATUS_VERIFIED)
        self.assertIn("design effect", entry["verification_notes"])
        self.assertIn("37.43 to 50.9", entry["verification_notes"])
        self.assertEqual(self.by_id["poverty_headcount"]["published_interval"], [37.43, 50.9])
        self.assertEqual(self.by_id["poverty_headcount"]["published_standard_error"], 3.43)

    def test_a_household_count_does_not_borrow_the_interval_of_the_percentage_beside_it(self):
        entry = self.by_id["district_sample_households"]
        self.assertIsNone(entry["published_interval"])
        self.assertIsNone(entry["published_standard_error"])

    def test_health_insurance_matches_for_the_district_and_for_rwanda(self):
        self.assertEqual(self.by_id["health_insurance"]["published_value"], 78.09)
        self.assertEqual(self.by_id["health_insurance_national"]["published_value"], 85.31)
        self.assertEqual(self.by_id["health_insurance"]["verification_status"], v.STATUS_VERIFIED)

    def test_grid_electricity_is_a_methodology_mismatch_not_a_discrepancy(self):
        entry = self.by_id["grid_connection"]
        self.assertEqual(entry["verification_status"], v.STATUS_MISMATCH)
        self.assertEqual(entry["internal_value"], 66.0)
        self.assertIn("main source of lighting", entry["verification_notes"])
        self.assertEqual(entry["other_published"][0]["table"], "B.7")

    def test_vup_is_not_externally_verified_and_the_sample_size_matches(self):
        self.assertEqual(self.by_id["vup_among_poor"]["verification_status"], v.STATUS_UNVERIFIED)
        self.assertEqual(self.by_id["district_sample_households"]["verification_status"], v.STATUS_VERIFIED)

    def test_the_true_directions_expose_the_electricity_error_in_the_supplied_report(self):
        directions = {item["id"]: item["direction"] for item in self.result["directions"]}
        self.assertEqual(directions["grid_connection"], "above")      # 66.0% is above 50.8%: the report wrongly said "below"
        self.assertEqual(directions["health_insurance"], "below")     # 78.1% is below 85.3%
        self.assertEqual(directions["poverty"], "above")

    def test_nothing_was_overwritten_and_the_audit_trail_records_every_check(self):
        self.assertEqual(self.by_id["grid_connection"]["internal_value"], 66.0)
        steps = [item["step"] for item in self.result["audit_trail"]]
        self.assertEqual((steps[0], steps[-1]), ("start", "finish"))
        self.assertIn("retrieve", steps)
        self.assertIn("compare", steps)
        self.assertEqual(self.result["summary"]["unresolved"], 0)


class BatchTests(unittest.TestCase):
    @staticmethod
    def save(store: Path, run_id: str, district: str, verified: bool):
        folder = store / "runs" / run_id
        folder.mkdir(parents=True)
        (folder / "manifest.json").write_text(json.dumps({"id": run_id, "district": district, "status": "Warning", "updated_at": "2026-10-29"}), encoding="utf-8")
        result = {"problem_profile": {"headline": "h", "stands_out": [], "possible": []}}
        if verified:
            result["verification"] = {"status": "Completed", "summary": {"total": 15, "counts": {"verified_match": 8}, "unresolved": 0, "unresolved_items": []}}
        (folder / "08-preparing-findings.json").write_text(json.dumps({"result": result}), encoding="utf-8")

    def test_the_batch_reruns_districts_that_have_no_evidence_verification_and_skips_the_rest(self):
        from unittest.mock import patch
        from tools.investigation import board
        with tempfile.TemporaryDirectory() as directory:
            store = Path(directory)
            self.save(store, "a", "Rusizi", True)
            self.save(store, "b", "Gisagara", False)
            calls = []

            def fake_run(command, **kwargs):
                calls.append(command[command.index("--district") + 1])
                return type("Outcome", (), {"returncode": 0, "stderr": ""})()

            with patch.object(board.subprocess, "run", side_effect=fake_run):
                failed = board.run_missing(["Rusizi", "Gisagara", "Huye"], store=store, log=lambda _: None)
            self.assertEqual((failed, calls), ([], ["Gisagara", "Huye"]))

    def test_the_board_carries_each_districts_verification_summary(self):
        from tools.investigation import board
        with tempfile.TemporaryDirectory() as directory:
            store = Path(directory)
            self.save(store, "a", "Rusizi", True)
            self.save(store, "b", "Huye", False)
            rows = {row["district"]: row for row in board.write_board(store, ["Rusizi", "Huye"])["districts"]}
            self.assertEqual(rows["Rusizi"]["verification"]["counts"]["verified_match"], 8)
            self.assertIsNone(rows["Huye"]["verification"])


if __name__ == "__main__":
    unittest.main()
