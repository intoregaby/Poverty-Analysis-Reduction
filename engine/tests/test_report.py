import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from acceptance import acceptance  # noqa: E402
from ireme import report  # noqa: E402


def fixture():
    return report.build_ast('r1', '1', 'District findings', 'draft', [{
        'id': 'summary', 'title': 'Poverty estimates',
        'claims': [{'claim_id': 'c1', 'text': 'Kamonyi: 39.7%; national: 27.4%.'}],
        'tables': [{'id': 'Estimates', 'title': 'Survey results',
                    'columns': ['District', 'Rate', 'SE'],
                    'rows': [['Kamonyi', '39.7', '3.3'], ['Rwanda', '27.4', '0.5']]}],
        'charts': [{'id': 'rates', 'title': 'Rates', 'table_id': 'Estimates', 'x': 'District', 'y': 'Rate'}]
    }], ['Independent scientific review pending.'], 'External comparison pending.')


class ReportTests(unittest.TestCase):
    def test_cross_format_round_trip(self):
        ast = fixture()
        self.assertEqual(report.parity(ast, report.render_html(ast), report.render_pdf(ast),
                                       report.render_xlsx(ast)), [])

    def test_restricted_and_revoked_statuses_survive_pdf(self):
        for status in ('restricted_draft', 'qa_failed', 'awaiting_review', 'approved', 'published', 'revoked'):
            ast = fixture()
            ast['status'] = status
            ast['ast_sha256'] = report.canonical_hash({k: v for k, v in ast.items() if k != 'ast_sha256'})
            with self.subTest(status=status):
                self.assertEqual(report.extract_pdf(report.render_pdf(ast))['status'], status)

    def test_snapshot_mutation_blocks_every_renderer(self):
        ast = fixture()
        ast['sections'][0]['claims'][0]['text'] = 'Fabricated rate: 99%.'
        for renderer in (report.render_html, report.render_pdf, report.render_xlsx):
            with self.subTest(renderer=renderer.__name__), self.assertRaises(ValueError):
                renderer(ast)

    def test_frozen_snapshot_does_not_alias_input(self):
        original = fixture()
        sections = copy.deepcopy(original['sections'])
        ast = report.build_ast('r1', '1', 'District findings', 'draft', sections, [], '')
        sections[0]['claims'][0]['text'] = 'Changed'
        report.validate_snapshot(ast)
        self.assertNotEqual(ast['sections'], sections)

    def test_pdf_extra_numeric_claim_is_detected(self):
        ast = fixture()
        altered = copy.deepcopy(ast)
        altered['sections'][0]['claims'][0]['text'] += ' Another unsupported figure: 88.8%.'
        altered['ast_sha256'] = report.canonical_hash({k: v for k, v in altered.items() if k != 'ast_sha256'})
        result = report.parity(ast, report.render_html(ast), report.render_pdf(altered), report.render_xlsx(ast))
        self.assertIn('PDF numeric sequence differs from AST', result)

    @acceptance("OPS-05")
    def test_native_chart_links_to_numeric_cells(self):
        ast = fixture()
        extracted = report.extract_xlsx(report.render_xlsx(ast))
        self.assertEqual(len(extracted['charts']), 1)
        self.assertTrue(extracted['charts'][0]['native'])
        self.assertIn('Estimates!$B$2:$B$3', extracted['charts'][0]['refs'])
        self.assertEqual(extracted['tables']['Estimates'][1][1], 39.7)
