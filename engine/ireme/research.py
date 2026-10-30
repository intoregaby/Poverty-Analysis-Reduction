"""Versioned hypothesis ledger; assessments never certify facts, reports or causality.

Uses the catalog's transaction/tenant boundary. The API authenticates the principal;
every operation additionally checks current district and dataset permission. Models
have no write credential and cannot submit a scientific verdict through this API.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from . import auth
from .catalog import CatalogIntegrityError, digest, encode

Text = Annotated[str, Field(min_length=1, max_length=2000, pattern=r'\S')]
Identifier = Annotated[str, Field(pattern=r'^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$')]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)


class EvidenceRef(StrictModel):
    kind: Literal['scientific-run', 'official-fact', 'research-test', 'identification-study']
    entity: Identifier
    version: Identifier
    sha256: Annotated[str, Field(pattern=r'^[0-9a-f]{64}$')]


class Hypothesis(StrictModel):
    hypothesis_id: Identifier
    statement: Text
    direction: Literal['above', 'below', 'positive', 'negative', 'no_difference', 'unspecified']
    competing_ids: Annotated[list[Identifier], Field(min_length=1, max_length=49)]
    test_plan: Text
    status: Literal['open', 'supported', 'weakened', 'rejected', 'inconclusive'] = 'open'
    evidence_for: Annotated[list[EvidenceRef], Field(max_length=100)] = Field(default_factory=list)
    evidence_against: Annotated[list[EvidenceRef], Field(max_length=100)] = Field(default_factory=list)
    tests_run: Annotated[list[EvidenceRef], Field(max_length=100)] = Field(default_factory=list)
    adjusted_inference: Literal['untested', 'not_adjusted', 'holm', 'benjamini_hochberg', 'prespecified_single_test', 'not_applicable'] = 'untested'
    causal_identification_status: Literal['not_established', 'association_only', 'identified'] = 'not_established'
    identification_study: EvidenceRef | None = None
    confidence_category: Literal['unknown', 'low', 'moderate', 'high'] = 'unknown'
    data_gaps: Annotated[list[Text], Field(max_length=50)] = Field(default_factory=list)
    reasons_not_tested: Annotated[list[Text], Field(max_length=50)] = Field(default_factory=list)
    next_evidence_request: Annotated[list[Text], Field(max_length=50)] = Field(default_factory=list)
    assessment_reason: Text | None = None


class LedgerDocument(StrictModel):
    question: Text
    hypotheses: Annotated[list[Hypothesis], Field(min_length=2, max_length=50)]
    stop_reason: Literal['evidence_exhausted', 'inadequate_precision', 'privacy_risk', 'source_unavailable',
                         'cost_budget_exhausted', 'time_budget_exhausted', 'methodology_disputed'] | None = None


class LedgerWrite(StrictModel):
    base_version: Annotated[int, Field(ge=0)]
    document: LedgerDocument


class ResearchConflict(ValueError):
    pass


class ResearchInvalid(ValueError):
    pass


class HypothesisLedger:
    def __init__(self, catalog, principal, run_id, district):
        self.catalog, self.principal, self.run_id, self.district = catalog, principal, run_id, district
        if (catalog.tenant, catalog.principal) != (principal.tenant, principal.subject):
            raise auth.AuthorizationError('Authenticated catalog identity differs')
        catalog.db.executescript('''
          CREATE TABLE IF NOT EXISTS research_ledger_revisions(
            tenant TEXT NOT NULL, investigation TEXT NOT NULL, district TEXT NOT NULL,
            version INTEGER NOT NULL CHECK(version > 0), idem_key TEXT NOT NULL,
            request_hash TEXT NOT NULL, payload TEXT NOT NULL, sha256 TEXT NOT NULL,
            PRIMARY KEY(tenant,investigation,district,version),
            UNIQUE(tenant,investigation,district,idem_key));
          CREATE TRIGGER IF NOT EXISTS research_no_update BEFORE UPDATE ON research_ledger_revisions
            BEGIN SELECT RAISE(ABORT,'immutable research revision'); END;
          CREATE TRIGGER IF NOT EXISTS research_no_delete BEFORE DELETE ON research_ledger_revisions
            BEGIN SELECT RAISE(ABORT,'immutable research revision'); END;
        ''')

    def _authorized(self, write=False):
        auth.authorize(self.principal, 'investigation:create' if write else 'investigation:read',
                       self.catalog.tenant, self.district)
        run = self.catalog.get('scientific-run', self.run_id, '1')
        readers = {'platform_admin', 'statistical_reviewer', 'privacy_reviewer', 'release_reviewer'}
        if run['inputs']['principal'] != self.principal.subject and not self.principal.roles.intersection(readers):
            raise auth.AuthorizationError('Investigation unavailable')
        source = run['inputs']
        self.catalog.authorize(source['permission_id'], source['dataset_id'], source['dataset_version'], source['purpose'])
        domains = {row['geography'] for row in run['differences']}
        if self.district != 'Rwanda' and self.district not in domains:
            raise ResearchInvalid('Unknown investigation district')
        return run

    def history(self):
        self._authorized()
        rows = self.catalog.db.execute('''SELECT version,payload,sha256 FROM research_ledger_revisions
            WHERE tenant=? AND investigation=? AND district=? ORDER BY version''',
            (self.catalog.tenant, self.run_id, self.district)).fetchall()
        previous, result = '0'*64, []
        for expected, (version, encoded, sha256) in enumerate(rows, 1):
            try:
                value = json.loads(encoded)
                if (version != expected or value['version'] != version or digest(value) != sha256
                        or value['previous_sha256'] != previous
                        or (value['tenant'], value['investigation_id'], value['district_id']) !=
                           (self.catalog.tenant, self.run_id, self.district)):
                    raise ValueError('Invalid revision chain')
            except (ValueError, KeyError, TypeError):
                raise CatalogIntegrityError('Research revision chain failed integrity verification') from None
            previous = sha256
            result.append({'snapshot': value, 'sha256': sha256})
        return result

    def _validate(self, document, old, run):
        entries = {h['hypothesis_id']: h for h in document['hypotheses']}
        if len(entries) != len(document['hypotheses']):
            raise ResearchInvalid('Duplicate hypothesis identity')
        prior = {h['hypothesis_id']: h for h in old['document']['hypotheses']} if old else {}
        if not prior.keys() <= entries.keys():
            raise ResearchInvalid('Hypotheses cannot be removed; retain rejected alternatives')
        if old and old['document']['question'] != document['question']:
            raise ResearchInvalid('A new research question requires a new investigation')
        root = ('scientific-run', self.run_id, '1')
        permitted = {root} | {edge['child'] for edge in self.catalog.lineage(root)}

        def resolve(ref):
            node = (ref['kind'], ref['entity'], ref['version'])
            if node not in permitted:
                raise ResearchInvalid('Evidence is outside this investigation lineage')
            value = self.catalog.get(*node)
            if digest(value) != ref['sha256']:
                raise ResearchInvalid('Evidence snapshot differs')
            if node != root:
                if ref['kind'] == 'official-fact':
                    if value.get('geography_id') != self.district:
                        raise ResearchInvalid('Official evidence geography differs')
                    if value.get('period') != run['definition']['survey_wave']:
                        raise ResearchInvalid('Official evidence period differs')
                elif (value.get('investigation_id'), value.get('district_id')) != (self.run_id, self.district):
                    raise ResearchInvalid('Research evidence scope differs')
            return value

        for hid, item in entries.items():
            competitors = item['competing_ids']
            if hid in competitors or len(set(competitors)) != len(competitors) or not set(competitors) <= entries.keys():
                raise ResearchInvalid('Competing hypotheses must resolve to distinct retained alternatives')
            for competitor in competitors:
                if hid not in entries[competitor]['competing_ids']:
                    raise ResearchInvalid('Competing hypothesis links must be reciprocal')
            if hid in prior:
                before = prior[hid]
                for key in ('statement', 'direction', 'test_plan'):
                    if item[key] != before[key]:
                        raise ResearchInvalid('Reframed hypotheses require a new identity')
                for key in ('competing_ids', 'evidence_for', 'evidence_against', 'tests_run'):
                    if not {encode(v) for v in before[key]} <= {encode(v) for v in item[key]}:
                        raise ResearchInvalid('Existing alternatives, evidence and tests cannot be erased')
            for ref in item['evidence_for'] + item['evidence_against']:
                resolve(ref)
            tests = []
            for ref in item['tests_run']:
                value = resolve(ref)
                if ref['kind'] != 'research-test' or value.get('hypothesis_id') != hid:
                    raise ResearchInvalid('Test must be bound to this hypothesis')
                if value.get('adjusted_inference') != item['adjusted_inference']:
                    raise ResearchInvalid('Adjusted inference must match executed test evidence')
                tests.append(value)
            if not tests and item['adjusted_inference'] != 'untested':
                raise ResearchInvalid('Inference requires an executed test')
            if not tests and not item['reasons_not_tested']:
                raise ResearchInvalid('Untested hypotheses require explicit reasons')
            if item['status'] in ('supported', 'weakened', 'rejected') or item['confidence_category'] != 'unknown':
                if not tests or not item['assessment_reason'] or any(
                    t.get('scientific_decision') != 'independently_validated' or t.get('reviewer_independence') is not True
                    for t in tests):
                    raise ResearchInvalid('Assessment needs independently validated tests and a reason')
                refs = item['evidence_against'] if item['status'] in ('weakened', 'rejected') else item['evidence_for']
                if not refs:
                    raise ResearchInvalid('Assessment requires directional evidence')
            if item['causal_identification_status'] == 'identified':
                ref = item['identification_study']
                if not ref or ref['kind'] != 'identification-study':
                    raise ResearchInvalid('Causal identification requires an approved study')
                study = resolve(ref)
                if (study.get('status') != 'approved' or not study.get('approved_by')
                        or study['approved_by'] == study.get('author')
                        or study.get('design') not in ('randomised_trial', 'regression_discontinuity',
                                                     'difference_in_differences', 'instrumental_variable')):
                    raise ResearchInvalid('Study lacks independent identification approval')
            elif item['identification_study']:
                resolve(item['identification_study'])

    def append(self, write: LedgerWrite, idempotency_key, trace_id):
        if not isinstance(idempotency_key, str) or not 8 <= len(idempotency_key) <= 128:
            raise ResearchInvalid('Bounded idempotency key required')
        # Snapshot typed input before entering the atomic authorization/CAS boundary.
        payload = write.model_dump(mode='json')
        # Idempotency identifies the requested document, not the CAS base_version: an identical
        # replay after a successful write must return that revision instead of conflicting.
        request_hash = digest([self.principal.subject, payload['document']])
        db = self.catalog.db
        db.execute('BEGIN IMMEDIATE')
        try:
            run = self._authorized(write=True)
            history = self.history()
            existing = db.execute('''SELECT version,request_hash FROM research_ledger_revisions
                WHERE tenant=? AND investigation=? AND district=? AND idem_key=?''',
                (self.catalog.tenant, self.run_id, self.district, idempotency_key)).fetchone()
            if existing:
                if existing[1] != request_hash:
                    raise ResearchConflict('Idempotency key reused with different content or principal')
                result = history[existing[0]-1]
                db.commit()
                return result
            if payload['base_version'] != len(history):
                raise ResearchConflict('Research revision changed; reload before editing')
            old = history[-1]['snapshot'] if history else None
            self._validate(payload['document'], old, run)
            value = {'schema_version': 1, 'tenant': self.catalog.tenant, 'investigation_id': self.run_id,
                'district_id': self.district, 'version': len(history)+1, 'document': payload['document'],
                'previous_sha256': history[-1]['sha256'] if history else '0'*64,
                'actor': self.principal.subject, 'trace_id': trace_id,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'registration_timing': 'post_analysis', 'authority': 'research_assessment_only',
                'certifies_facts': False, 'approves_release': False}
            checksum = digest(value)
            db.execute('INSERT INTO research_ledger_revisions VALUES(?,?,?,?,?,?,?,?)',
                (self.catalog.tenant, self.run_id, self.district, value['version'], idempotency_key,
                 request_hash, encode(value), checksum))
            db.commit()
            return {'snapshot': value, 'sha256': checksum}
        except Exception:
            db.rollback()
            raise
