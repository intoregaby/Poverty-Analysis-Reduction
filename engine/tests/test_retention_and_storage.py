"""Retention enforcement and object-store outage semantics (PRIV-15, OPS-09).

Synthetic fixtures: real SQLite catalog, real filesystem object store, injected licence dates
and injected write failures. No external object store or production retention scheduler runs.
"""
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from acceptance import acceptance  # noqa: E402
from ireme import object_store, release_gate, reports, retention  # noqa: E402
from ireme.catalog import Catalog  # noqa: E402
import test_reports_api as fixtures  # noqa: E402

NOW = datetime(2026, 10, 30, tzinfo=timezone.utc)


class Retention(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.catalog = Catalog(Path(self.tmp.name) / "catalog.db", "tenant-a", "analyst")
        self.addCleanup(self.catalog.close)

    def grant(self, retention_end):
        self.catalog.dataset("eicv7", "1", "a" * 64, "confidential_microdata", "b" * 64,
                             retention_expires_at=retention_end)
        self.catalog.grant("permit-1", "eicv7", "1", ["research"], "2020-01-01T00:00:00Z",
                           "2099-01-01T00:00:00Z", "c" * 64)

    @acceptance("PRIV-15")
    def test_expired_retention_denies_every_use_and_is_reported(self):
        self.grant("2026-10-01T00:00:00Z")
        with self.assertRaises(retention.RetentionExpired):
            self.catalog.authorize("permit-1", "eicv7", "1", "research", at=NOW)
        status = self.catalog.retention_status(at=NOW)
        self.assertEqual(status, [{"dataset_id": "eicv7", "version": "1", "expired": True,
                                   "retention_expires_at": "2026-10-01T00:00:00Z"}])

    def test_unexpired_and_unbounded_datasets_remain_usable(self):
        self.grant((NOW + timedelta(days=1)).isoformat())
        self.assertEqual(self.catalog.authorize("permit-1", "eicv7", "1", "research", at=NOW)["sha256"],
                         "a" * 64)

    def test_retention_boundary_must_be_timezone_aware_and_exact(self):
        with self.assertRaises(ValueError):
            self.catalog.dataset("eicv7", "1", "a" * 64, "public", "b" * 64,
                                 retention_expires_at="2027-01-01T00:00:00")
        self.grant("2026-10-30T00:00:00Z")
        with self.assertRaises(retention.RetentionExpired):
            self.catalog.authorize("permit-1", "eicv7", "1", "research", at=NOW)
        self.catalog.authorize("permit-1", "eicv7", "1", "research", at=NOW - timedelta(seconds=1))


class ObjectStoreOutage(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def test_outage_retries_then_fails_without_leaving_a_partial_object(self):
        attempts = []

        def failing_writer(path, data):
            attempts.append(path)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data[: len(data) // 2])      # partial write, then disk failure
            raise OSError("simulated object-store outage")

        store = object_store.ContentAddressedStore(self.root, max_attempts=3, writer=failing_writer)
        with self.assertRaises(object_store.ObjectStoreUnavailable):
            store.put(b"report bytes", namespace="reports")
        self.assertEqual(len(attempts), 3)
        self.assertEqual([p for p in self.root.rglob("*") if p.is_file()], [])

    def test_recovery_is_content_addressed_and_verified(self):
        store = object_store.ContentAddressedStore(self.root)
        info = store.put(b"report bytes", namespace="reports")
        self.assertTrue(info["created"])
        again = store.put(b"report bytes", namespace="reports")
        self.assertFalse(again["created"])
        self.assertEqual(store.get(info["sha256"], namespace="reports"), b"report bytes")
        target = self.root / "reports" / info["sha256"]
        target.write_bytes(b"tampered")
        with self.assertRaises(object_store.ObjectIntegrityError):
            store.get(info["sha256"], namespace="reports")

    @acceptance("OPS-09")
    def test_publication_survives_an_object_store_outage_without_stale_state(self):
        tmp_report = Path(self.tmp.name) / "reports.db"
        store = reports.ReportStore(tmp_report)
        self.addCleanup(store.close)
        checks = {k: True for k in release_gate.load_policy()["required"]
                  if k != "authorized_reviewer_signatures"}
        store.create(fixtures.document(), fixtures.ast_for(), "analyst", "Kamonyi", "tenant-a", checks)
        for reviewer, role in (("rev-stat", "statistical_reviewer"), ("rev-priv", "privacy_reviewer"),
                               ("rev-release", "release_reviewer")):
            store.review("rep1", "1", reviewer, frozenset({role}), "approve")
        self.assertEqual(store.get("rep1", "1").status, "approved")

        def failing_writer(path, data):
            raise OSError("simulated outage")

        broken = object_store.ContentAddressedStore(Path(self.tmp.name) / "objects",
                                                     max_attempts=2, writer=failing_writer)
        with self.assertRaises(object_store.ObjectStoreUnavailable):
            store.publish("rep1", "1", "publisher", frozenset({"publication_authority"}), artifacts=broken)
        self.assertEqual(store.get("rep1", "1").status, "approved")   # not published without bytes

        healthy = object_store.ContentAddressedStore(Path(self.tmp.name) / "objects")
        store.publish("rep1", "1", "publisher", frozenset({"publication_authority"}), artifacts=healthy)
        self.assertEqual(store.get("rep1", "1").status, "published")
        principal = type("P", (), {"tenant": "tenant-a", "districts": frozenset({"Kamonyi"})})()
        body, media = store.export("rep1", "1", principal, "html", artifacts=healthy)
        self.assertEqual(media, reports.FORMATS["html"])
        self.assertIn(b"data-claim-id='c1'", body)


if __name__ == "__main__":
    unittest.main()
