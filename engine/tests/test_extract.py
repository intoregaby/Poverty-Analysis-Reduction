import io
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from acceptance import acceptance  # noqa: E402
from ireme import extract, provenance  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
MAIN_PDF = ROOT / "investigations" / "source-cache" / "eicv7-main-6105321b6eda.pdf"
DISTRICTS = ["Nyarugenge", "Gasabo", "Kicukiro", "Nyanza", "Gisagara", "Nyaruguru", "Huye", "Nyamagabe", "Ruhango",
             "Muhanga", "Kamonyi", "Karongi", "Rutsiro", "Rubavu", "Nyabihu", "Ngororero", "Rusizi", "Nyamasheke",
             "Rulindo", "Gakenke", "Musanze", "Burera", "Gicumbi", "Rwamagana", "Nyagatare", "Gatsibo", "Kayonza",
             "Kirehe", "Ngoma", "Bugesera"]
CAPTION = "Table A9.23: Headcount Poverty rate (%) by area of residence, province and district"


@unittest.skipUnless(MAIN_PDF.exists(), "real NISR EICV7 main report not in the local source cache")
class RealOfficialPdf(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.res = extract.extract_poverty_table(MAIN_PDF.read_bytes(), "eicv7-main", CAPTION, "2025-07-10")

    @acceptance("EVD-05", evidence="real")
    def test_all_30_districts_plus_national_extracted_with_page_provenance(self):
        by = {f["geography_id"]: f for f in self.res["facts"]}
        missing = [d for d in DISTRICTS if d not in by]
        self.assertEqual(missing, [])
        self.assertIn("Rwanda", by)
        self.assertEqual(self.res["needs_review"], [])
        self.assertEqual(self.res["pages"], [109])                  # PDF page 109 = printed page 107; TOC entry excluded
        k = by["Kamonyi"]
        self.assertEqual((k["point_estimate"], k["standard_error"], k["ci_lower"], k["ci_upper"]),
                         (39.65, 3.33, 33.11, 46.18))               # as printed in the NISR table
        self.assertIn("pdf-page 109", k["table_location"])
        self.assertEqual(k["extraction_status"], "table_verified")
        self.assertEqual(by["Rwanda"]["point_estimate"], 27.36)

    @acceptance("EVD-05", evidence="real")
    def test_extracted_facts_satisfy_the_official_fact_contract(self):
        store = provenance.FactStore()
        for f in self.res["facts"]:
            store.add_official(f)
        self.assertGreaterEqual(len(store.official), 35)

    @acceptance("EVD-05", evidence="real")
    def test_corrupted_row_is_not_table_verified(self):
        bad = {"estimate": 39.65, "se": 3.33, "ci_low": 33.11, "ci_high": 40.0, "cv": 8.41}
        self.assertTrue(extract.verify_poverty_row(bad))
        good = {"estimate": 39.65, "se": 3.33, "ci_low": 33.11, "ci_high": 46.18, "cv": 8.41}
        self.assertEqual(extract.verify_poverty_row(good), [])


class Xlsx(unittest.TestCase):
    def workbook(self, extra_formula=False):
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Table1"
        ws.append(["District", "Poverty rate (%)", "SE"])
        ws.append(["Kamonyi", 39.65, 3.33])
        ws.append(["Muhanga", 14.95, 2.19])
        if extra_formula:
            ws.append(["=HYPERLINK(\"http://evil\",\"x\")", "=SUM(B2:B3)", "+cmd|' /C calc'!A0"])
        b = io.BytesIO()
        wb.save(b)
        return b.getvalue()

    @acceptance("EVD-04")
    def test_xlsx_cell_value_and_coordinate(self):
        t = extract.read_xlsx_tables(self.workbook())
        v, ref = extract.locate_xlsx_cell(t["sheets"], "Table1", "Kamonyi", "Poverty rate (%)")
        self.assertEqual((v, ref), (39.65, "Table1!B2"))
        with self.assertRaises(KeyError):
            extract.locate_xlsx_cell(t["sheets"], "Table1", "Atlantis", "SE")

    @acceptance("PRIV-10")
    def test_malicious_formulas_are_inert_and_reported(self):
        t = extract.read_xlsx_tables(self.workbook(extra_formula=True))
        self.assertEqual(len(t["formulas_found"]), 2)
        last = t["sheets"]["Table1"][-1]
        self.assertTrue(all(isinstance(c, str) and c.startswith("'") for c in last))
        self.assertEqual(extract.neutralise_cell("-12.5"), "-12.5")          # genuine negative number untouched
        self.assertEqual(extract.neutralise_cell("@SUM(1)"), "'@SUM(1)")

    @acceptance("PRIV-11")
    def test_zip_slip_symlink_and_bomb_rejected(self):
        def mk(name, data=b"x", symlink=False):
            b = io.BytesIO()
            with zipfile.ZipFile(b, "w") as z:
                zi = zipfile.ZipInfo(name)
                if symlink:
                    zi.external_attr = 0o120777 << 16
                z.writestr(zi, data)
            return b.getvalue()

        with tempfile.TemporaryDirectory() as d:
            for name in ("../evil.txt", "/abs/evil.txt", "a/../../evil.txt", "C:/win/evil.txt"):
                with self.assertRaises(extract.ArchiveRejected, msg=name):
                    extract.safe_extract_zip(mk(name), Path(d))
            with self.assertRaises(extract.ArchiveRejected):
                extract.safe_extract_zip(mk("link", b"/etc/passwd", symlink=True), Path(d))
            with self.assertRaises(extract.ArchiveRejected):
                extract.safe_extract_zip(mk("ok.txt", b"x" * 1000), Path(d), max_total=10)
            self.assertEqual(extract.safe_extract_zip(mk("data/ok.txt"), Path(d)), ["data/ok.txt"])
            self.assertTrue((Path(d) / "data" / "ok.txt").exists())
            self.assertFalse((Path(d).parent / "evil.txt").exists())


if __name__ == "__main__":
    unittest.main()
