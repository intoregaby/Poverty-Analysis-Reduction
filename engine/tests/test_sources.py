import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from acceptance import acceptance  # noqa: E402
from ireme import evidence_sets as es  # noqa: E402
from ireme import provenance, sources, urlguard  # noqa: E402
from ireme.semantics import Equivalence, EquivalenceRegistry  # noqa: E402
from test_trust import calc_fact, official, store_with, eqreg  # noqa: E402

HOSTS = {"statistics.gov.rw"}
PUBLIC = lambda host: ["41.186.1.10"]  # noqa: E731
URL = "https://www.statistics.gov.rw/file/eicv7.pdf"


def ok(url):
    return b"%PDF official bytes"


def boom(url):
    raise ConnectionError("connection reset")


def slow(url):
    raise sources.FetchTimeout("read timed out after 30s")


class Retrieval(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cache = sources.SourceCache(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def get(self, fetch, sid="eicv7-main"):
        return sources.retrieve(sid, URL, self.cache, fetch, HOSTS, PUBLIC)

    @acceptance("EVD-02")
    def test_outage_with_cache_serves_verified_cache(self):
        live = self.get(ok)
        self.assertEqual(live.status, "retrieved_live")
        r = self.get(boom)
        self.assertEqual(r.status, "served_from_cache")
        self.assertTrue(r.from_cache)
        self.assertEqual(r.content, live.content)
        self.assertEqual(r.sha256, live.sha256)

    @acceptance("EVD-03")
    def test_outage_without_cache_is_explicit_not_a_verified_headline(self):
        r = self.get(boom)
        self.assertEqual(r.status, "retrieval_failed_no_cache")
        self.assertIsNone(r.content)
        comps = [{"status": "retrieval_failed"}] * 20 + [{"status": "externally_matched"}] * 4
        s = es.summarize(comps, 24)
        self.assertEqual(s["verified"], 4)
        self.assertIn("20 could not be checked because the source could not be read", s["headline"])

    @acceptance("EVD-11")
    def test_corrupted_cache_is_rejected_not_used(self):
        self.get(ok)
        blob, _ = self.cache._paths("eicv7-main")
        blob.write_bytes(b"%PDF tampered bytes")
        r = self.get(boom)
        self.assertEqual(r.status, "cache_corrupt")
        self.assertIsNone(r.content)
        blob.write_bytes(b"%PDF official bytes!")                # same-prefix truncation/extension also caught
        self.assertEqual(self.get(boom).status, "cache_corrupt")

    @acceptance("EVD-12")
    def test_timeout_is_not_reported_as_not_published(self):
        r = self.get(slow)
        self.assertEqual(r.status, "retrieval_timeout")
        self.assertNotEqual(r.status, "reference_not_found")
        self.get(ok)
        self.assertEqual(self.get(slow).status, "served_from_cache")

    @acceptance("PRIV-09")
    def test_ssrf_urls_blocked(self):
        for url in ("http://www.statistics.gov.rw/a.pdf", "https://169.254.169.254/latest/meta-data",
                    "https://127.0.0.1/x", "https://evil.example.com/x", "https://statistics.gov.rw.evil.com/x",
                    "https://user:pw@www.statistics.gov.rw/x", "file:///etc/passwd", "https://[::1]/x",
                    "https://[::ffff:10.0.0.1]/x"):
            r = sources.retrieve("s", url, self.cache, ok, HOSTS, PUBLIC)
            self.assertEqual(r.status, "blocked_url", url)
        # DNS rebinding style: allowlisted name that resolves to a private address
        r = sources.retrieve("s", URL, self.cache, ok, HOSTS, lambda h: ["10.0.0.5"])
        self.assertEqual(r.status, "blocked_url")
        self.assertEqual(sources.retrieve("s", URL, self.cache, ok, HOSTS, PUBLIC).status, "retrieved_live")

    def test_path_traversal_source_id_refused(self):
        for sid in ("../evil", "a/b", ".hidden", ""):
            with self.assertRaises(ValueError):
                self.cache.put(sid, b"x", URL)


class Rollups(unittest.TestCase):
    @acceptance("EVD-13")
    def test_verification_row_counts_always_reconcile(self):
        comps = [{"status": s} for s in ("externally_matched", "external_mismatch", "not_comparable",
                                         "retrieval_failed", "reference_not_found", "self_match_rejected")]
        s = es.summarize(comps, 15)
        self.assertEqual(s["not_attempted"], 9)
        self.assertTrue(s["all_accounted_for"])
        self.assertEqual(sum(s["counts"].values()) + s["not_attempted"], 15)
        self.assertTrue(s["release_blocking"])
        self.assertFalse(es.summarize([{"status": "externally_matched"}], 1)["release_blocking"])

    @acceptance("EVD-14")
    def test_unconsulted_official_paper_cannot_be_cited(self):
        refs = es.build_references([{"source_id": "a", "read_status": "read"},
                                    {"source_id": "b", "read_status": "retrieval_failed"},
                                    {"source_id": "c"}])
        self.assertEqual([s["source_id"] for s in refs["consulted"]], ["a"])
        self.assertEqual({s["source_id"] for s in refs["not_consulted"]}, {"b", "c"})
        es.assert_citable("a", refs)
        with self.assertRaises(ValueError):
            es.assert_citable("b", refs)

    @acceptance("EVD-09")
    def test_newest_publication_wins_and_older_is_superseded(self):
        old = official("o-old", value=39.0)
        old["publication_date"] = "2024-12-01"
        new = official("o-new", value=39.7)
        new["publication_date"] = "2025-03-01"
        r = es.resolve_official([old, new])
        self.assertEqual(list(r["chosen"].values())[0]["official_fact_id"], "o-new")
        self.assertEqual(r["superseded"], ["o-old"])
        self.assertEqual(r["conflicts"], [])

    @acceptance("EVD-10")
    def test_same_day_disagreement_is_a_conflict_not_a_pick(self):
        a, b = official("o-a", value=39.7), official("o-b", value=41.2)
        r = es.resolve_official([a, b])
        self.assertEqual(r["chosen"], {})
        self.assertEqual(r["conflicts"][0]["values"], [39.7, 41.2])

    @acceptance("EVD-15")
    def test_tolerance_registered_before_use_and_rounding_aware(self):
        tr = es.ToleranceRegistry()
        with self.assertRaises(KeyError):
            tr.tolerance_for("poverty_headcount_district")
        with self.assertRaises(ValueError):
            tr.register("poverty_headcount_district", 1, "")
        tol = tr.register("poverty_headcount_district", 1, "stat-reviewer-1")
        self.assertAlmostEqual(tol, 0.05)
        eq = eqreg()
        for value, expect in ((39.74, "externally_matched"), (39.76, "external_mismatch")):
            s = store_with(calc_fact("fK", value=value, h="cH"))
            s.add_official(official("o1", value=39.7))
            self.assertEqual(provenance.compare(s, eq, "fK", "o1", tr.tolerance_for("poverty_headcount_district"),
                                                "rev")["status"], expect)

    @acceptance("EVD-16")
    def test_dataset_licence_checks(self):
        reg = es.LicenceRegistry()
        reg.grant("EICV7", {"research_report"}, "2027-01-31", "NISR data-sharing agreement 2025/14")
        reg.check("EICV7", "research_report", date(2026, 10, 30))
        for ds, purpose, today in (("EICV7", "commercial_resale", date(2026, 10, 30)),
                                   ("EICV7", "research_report", date(2027, 2, 1)),
                                   ("FinScope2024", "research_report", date(2026, 10, 30))):
            with self.assertRaises(PermissionError):
                reg.check(ds, purpose, today)

    @acceptance("EVD-17")
    def test_boundary_version_mismatch_is_not_comparable(self):
        s = store_with(calc_fact("fK", geo="RW-D-Kamonyi@2006", h="cH"))
        s.add_official(official("o1", geo="RW-D-Kamonyi@2012"))
        self.assertEqual(provenance.compare(s, eqreg(), "fK", "o1", 0.05, "r")["status"], "not_comparable")
        s2 = store_with(calc_fact("fK", geo="RW-D-Kamonyi@2006", h="cH"))
        s2.add_official(official("o1", geo="RW-D-Kamonyi@2006"))
        self.assertEqual(provenance.compare(s2, eqreg(), "fK", "o1", 0.05, "r")["status"], "externally_matched")


if __name__ == "__main__":
    unittest.main()
