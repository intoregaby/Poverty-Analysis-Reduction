"""Synthetic research records with real SQLite transactions and signed ASGI requests."""
import copy
from dataclasses import replace
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ireme import api, auth
from ireme.catalog import Catalog, digest
from ireme.research import HypothesisLedger, LedgerWrite, ResearchConflict, ResearchInvalid
import test_auth as fixture_auth


def proposal():
    return {'base_version': 0, 'document': {'question': 'Which explanations should be investigated?',
        'hypotheses': [{'hypothesis_id': a, 'statement': statement, 'direction': 'unspecified',
            'competing_ids': [b], 'test_plan': 'Register a suitable design before testing.',
            'reasons_not_tested': ['Suitable independently validated evidence is unavailable.']}
            for a, b, statement in [('access', 'confounding', 'Service access may contribute.'),
                                    ('confounding', 'access', 'Confounding may explain the association.')]]}}


class ResearchLedgerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fixture_auth.JwtAuthorization.setUpClass()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'catalog.db'
        self.catalog = Catalog(self.path, 'tenant-a', 'analyst')
        self.addCleanup(self.catalog.close)
        self.catalog.dataset('fixture', '1', 'a'*64, 'confidential_microdata', 'b'*64)
        self.catalog.grant('permit', 'fixture', '1', ['research'], '2000-01-01T00:00:00Z',
                           '2099-01-01T00:00:00Z', 'c'*64)
        self.catalog._insert('scientific-run', 'run-fixture', '1', {
            'inputs': {'principal': 'analyst', 'dataset_id': 'fixture', 'dataset_version': '1',
                       'permission_id': 'permit', 'purpose': 'research'},
            'definition': {'survey_wave': 'EICV7'},
            'differences': [{'geography': 'Kamonyi'}]})
        self.catalog.link(('dataset', 'fixture', '1'), ('scientific-run', 'run-fixture', '1'),
                          'd'*64, 'permit', 'research')
        self.signer = fixture_auth.JwtAuthorization()
        self.signer.setUp()
        self.principal = self.signer.verifier.verify(self.signer.token())
        self.ledger = HypothesisLedger(self.catalog, self.principal, 'run-fixture', 'Kamonyi')

    def append(self, value=None, key='fixture-idem-key'):
        return self.ledger.append(LedgerWrite.model_validate(value or proposal()), key, 'fixture-trace')

    def test_restart_idempotency_and_atomic_write_audit(self):
        first = self.append()
        opened = Catalog(self.path, 'tenant-a', 'analyst')
        self.addCleanup(opened.close)
        resumed = HypothesisLedger(opened, self.principal, 'run-fixture', 'Kamonyi')
        self.assertEqual(resumed.history(), [first])
        self.assertEqual(resumed.append(LedgerWrite.model_validate(proposal()), 'fixture-idem-key', 'new-trace'), first)
        snapshot = first['snapshot']
        self.assertEqual(snapshot['actor'], 'analyst')
        self.assertEqual(snapshot['trace_id'], 'fixture-trace')
        self.assertEqual(snapshot['registration_timing'], 'post_analysis')
        self.assertFalse(snapshot['certifies_facts'])
        self.assertFalse(snapshot['approves_release'])

    def test_stale_revisions_and_changed_replay_are_conflicts(self):
        self.append()
        with self.assertRaises(ResearchConflict):
            self.append(key='different-idem-key')
        value = proposal()
        value['document']['stop_reason'] = 'evidence_exhausted'
        with self.assertRaises(ResearchConflict):
            self.append(value)
        self.assertEqual(len(self.ledger.history()), 1)

    def test_competing_explanations_and_original_questions_cannot_be_erased(self):
        self.append()
        for mutation in ('remove', 'reframe', 'rewrite_question'):
            value = proposal()
            value['base_version'] = 1
            if mutation == 'remove':
                value['document']['hypotheses'][1]['hypothesis_id'] = 'replacement'
                value['document']['hypotheses'][0]['competing_ids'] = ['replacement']
            elif mutation == 'reframe':
                value['document']['hypotheses'][0]['statement'] = 'A different claim.'
            else:
                value['document']['question'] = 'A different question.'
            with self.subTest(mutation=mutation), self.assertRaises(ResearchInvalid):
                self.append(value, 'next-fixture-key')
        self.assertEqual(len(self.ledger.history()), 1)

    def test_evidence_is_hash_bound_scoped_and_retained_after_rejection(self):
        test = {'investigation_id': 'run-fixture', 'district_id': 'Kamonyi', 'hypothesis_id': 'access',
            'scientific_decision': 'independently_validated', 'reviewer_independence': True,
            'adjusted_inference': 'holm'}  # synthetic approval fixture, never actual scientific signoff
        self.catalog._insert('research-test', 'test-fixture', '1', test)
        self.catalog.link(('scientific-run', 'run-fixture', '1'), ('research-test', 'test-fixture', '1'),
                          'e'*64, 'permit', 'research')
        ref = {'kind': 'research-test', 'entity': 'test-fixture', 'version': '1', 'sha256': digest(test)}
        value = proposal()
        h = value['document']['hypotheses'][0]
        h.update(status='rejected', tests_run=[ref], evidence_against=[ref], adjusted_inference='holm',
                 assessment_reason='Contradicting evidence in the synthetic test.')
        bad = copy.deepcopy(value)
        bad['document']['hypotheses'][0]['tests_run'][0]['sha256'] = 'f'*64
        with self.assertRaises(ResearchInvalid):
            self.append(bad)
        first = self.append(value)
        self.assertEqual(first['snapshot']['document']['hypotheses'][0]['status'], 'rejected')
        value['base_version'] = 1
        value['document']['hypotheses'][0]['evidence_against'] = []
        with self.assertRaises(ResearchInvalid):
            self.append(value, 'next-fixture-key')

    def test_unsupported_confidence_causality_and_inference_are_denied(self):
        for patch in ({'status': 'supported'}, {'confidence_category': 'high'},
                      {'causal_identification_status': 'identified'}, {'adjusted_inference': 'holm'}):
            value = proposal()
            value['document']['hypotheses'][0].update(patch)
            with self.subTest(patch=patch), self.assertRaises(ResearchInvalid):
                self.append(value)
        self.assertEqual(self.ledger.history(), [])

    def test_revocation_role_and_district_checks_apply_on_replay(self):
        self.append()
        for principal, district in ((replace(self.principal, districts=frozenset()), 'Kamonyi'),
            (replace(self.principal, roles=frozenset({'gov_district'})), 'Kamonyi')):
            ledger = HypothesisLedger(self.catalog, principal, 'run-fixture', district)
            with self.assertRaises(auth.AuthorizationError):
                ledger.append(LedgerWrite.model_validate(proposal()), 'fixture-idem-key', 'trace')
        self.catalog.revoke('permit', 'Synthetic revocation')
        with self.assertRaises(PermissionError):
            self.append()
        with self.assertRaises(PermissionError):
            self.ledger.history()

    def test_database_update_and_delete_are_rejected(self):
        self.append()
        for sql in ('DELETE FROM research_ledger_revisions', "UPDATE research_ledger_revisions SET payload='{}'"):
            with self.assertRaises(sqlite3.IntegrityError):
                self.catalog.db.execute(sql)
            self.catalog.db.rollback()

    def test_authenticated_api_persists_versions_and_rejects_conflicting_or_invalid_writes(self):
        with TestClient(api.create_app(self.signer.verifier, self.path, Path(self.temp.name)/'audit.db')) as client:
            url = '/v1/investigations/run-fixture/hypotheses?district=Kamonyi'
            headers = {'Authorization': self.signer.token(), 'Idempotency-Key': 'api-fixture-key'}
            response = client.post(url, json=proposal(), headers=headers)
            self.assertEqual(response.status_code, 201, response.text)
            self.assertEqual(client.get(url, headers=headers).json()['history'], [response.json()])
            self.assertEqual(client.post(url, json=proposal(), headers=headers).json(), response.json())
            headers['Idempotency-Key'] = 'different-api-key'
            self.assertEqual(client.post(url, json=proposal(), headers=headers).status_code, 409)
            invalid = proposal()
            invalid['actor'] = 'spoofed-admin'
            self.assertEqual(client.post(url, json=invalid, headers=headers).status_code, 422)
            headers.pop('Idempotency-Key')
            self.assertEqual(client.post(url, json=proposal(), headers=headers).status_code, 422)
            self.assertEqual(client.get(url.replace('Kamonyi', 'Muhanga'), headers=headers).status_code, 403)
            self.assertEqual(client.get(url).status_code, 401)
