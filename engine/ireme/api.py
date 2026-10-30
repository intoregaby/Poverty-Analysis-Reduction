"""Authenticated boundary for persisted governed research.

The complete production API still requires the Postgres/Temporal adapters and
approved report-release service. No legacy unsigned artifact is exposed here.
"""
import os
import re
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException

from . import agents, auth
from .catalog import Catalog, CatalogIntegrityError
from .gateway import PolicyDenied, has_configured_keys
from .jobs import JobStore
from .profiles import get_config, ProfileConfig
from .reports import ReportAccessDenied, ReportStore
from .research import HypothesisLedger, LedgerWrite, ResearchConflict, ResearchInvalid


class ApiError(Exception):
    def __init__(self, status, code, message):
        self.status, self.code, self.message = status, code, message


class AgentRunRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')

    role: Literal['investigation_planner', 'skeptical_reviewer', 'causal_researcher', 'statistical_interpreter',
                  'report_planner', 'source_researcher', 'semantic_mapper', 'intervention_analyst',
                  'translation_assistant']
    question: str = Field(min_length=1, max_length=4000, pattern=r'\S')
    max_steps: int = Field(default=6, ge=1, le=12)
    max_repairs: int = Field(default=2, ge=0, le=4)


class ReportReviewRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')

    version: str = Field(min_length=1, max_length=64)
    decision: Literal['approve', 'reject']
    report_ast_sha256: str = Field(min_length=64, max_length=64, pattern=r'[0-9a-f]{64}')
    reason: str = Field(default='', max_length=2000)


class ReportPublishRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')

    version: str = Field(min_length=1, max_length=64)


class MfaToggleRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    enabled: bool


def create_app(verifier, catalog_path, audit_path, agent_gateway=None, agent_clearance=None, report_path=None,
               artifact_path=None, profile: ProfileConfig = None):
    if profile is None:
        profile = get_config()
    app = FastAPI(title='Ireme governed research API', version='1.0', docs_url=None,
                  redoc_url=None, openapi_url=None)

    @app.middleware('http')
    async def boundary(request: Request, call_next):
        trace = str(uuid4())
        request.state.trace_id = trace
        try:
            request.state.principal = await run_in_threadpool(verifier.verify, request.headers.get('Authorization'))
            response = await call_next(request)
        except auth.AuthenticationError:
            response = error(401, 'UNAUTHENTICATED', 'Valid bearer authentication required', trace)
            response.headers['WWW-Authenticate'] = 'Bearer'
        except auth.IdentityProviderUnavailable:
            response = error(503, 'IDENTITY_UNAVAILABLE', 'Identity-provider verification unavailable', trace)
        except auth.AuthorizationError:
            response = error(403, 'FORBIDDEN', 'Permission denied', trace)
        except ApiError as exc:
            response = error(exc.status, exc.code, exc.message, trace)
        except Exception:
            response = error(500, 'INTERNAL_ERROR', 'Request could not be completed', trace)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Trace-Id'] = trace
        return response

    def error(status, code, message, trace):
        return JSONResponse(status_code=status, content={'error_code': code, 'message': message,
                            'trace_id': trace, 'retryable': status == 503, 'details': {}})

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        # Framework errors obey the same contract and never echo route/input data.
        code = {404: 'NOT_FOUND', 405: 'METHOD_NOT_ALLOWED'}.get(exc.status_code, 'HTTP_ERROR')
        message = {404: 'Resource unavailable', 405: 'Method unavailable'}.get(exc.status_code, 'Request rejected')
        response = error(exc.status_code, code, message, request.state.trace_id)
        if exc.status_code == 405 and exc.headers and 'Allow' in exc.headers:
            response.headers['Allow'] = exc.headers['Allow']
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, _exc):
        return error(422, 'INVALID_REQUEST', 'Request parameters are invalid', request.state.trace_id)

    def permitted_run(request, run_id, district):
        principal = request.state.principal
        geography = district or 'Rwanda'
        auth.authorize(principal, 'investigation:read', principal.tenant, geography, profile=profile)
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', run_id):
            raise ApiError(404, 'NOT_FOUND', 'Investigation unavailable')
        catalog = Catalog(catalog_path, principal.tenant, principal.subject)
        try:
            record = catalog.get('scientific-run', run_id, '1')
            privileged = principal.roles.intersection({'platform_admin', 'statistical_reviewer', 'privacy_reviewer', 'release_reviewer'})
            if record['inputs']['principal'] != principal.subject and not privileged:
                raise ApiError(404, 'NOT_FOUND', 'Investigation unavailable')
            source = record['inputs']
            catalog.authorize(source['permission_id'], source['dataset_id'], source['dataset_version'], source['purpose'])
            audit = JobStore(audit_path)
            try:
                audit.log(principal.subject, 'research.read', {'tenant': principal.tenant,
                    'run_id': run_id, 'district': geography, 'trace_id': request.state.trace_id})
            finally:
                audit.close()
            return catalog, record, geography
        except KeyError:
            catalog.close()
            raise ApiError(404, 'NOT_FOUND', 'Investigation unavailable') from None
        except CatalogIntegrityError:
            catalog.close()
            raise ApiError(409, 'INTEGRITY_FAILED', 'Research evidence requires integrity review') from None
        except PermissionError:
            catalog.close()
            raise auth.AuthorizationError('Dataset permission unavailable') from None
        except Exception:
            catalog.close()
            raise

    @app.get('/v1/investigations/{run_id}')
    def investigation(run_id: str, request: Request, district: str | None = None):
        catalog, record, geography = permitted_run(request, run_id, district)
        try:
            differences = [row for row in record['differences']
                           if geography == 'Rwanda' or row['geography'] == geography]
            return {'investigation_id': run_id, 'status': record['status'], 'district': geography,
                    'manifest': record['manifest'], 'scientific_decision': record['scientific_decision'],
                    'reasons': record['reasons'], 'differences': differences,
                    'certified_fact_ids': list(record['certified_fact_ids'])}
        finally:
            catalog.close()

    @app.get('/v1/investigations/{run_id}/facts')
    def facts(run_id: str, request: Request, district: str | None = None):
        catalog, record, _ = permitted_run(request, run_id, district)
        catalog.close()
        # The current research workflow never mints certified facts. Do not expose
        # raw stage estimates as authoritative numbers through a different route.
        raise ApiError(409, 'FACTS_NOT_CERTIFIED', 'Independent scientific approval is required')

    @app.get('/v1/investigations/{run_id}/lineage')
    def lineage(run_id: str, request: Request, district: str | None = None):
        catalog, _record, _geography = permitted_run(request, run_id, district)
        try:
            return {'investigation_id': run_id,
                    'edges': catalog.lineage(('scientific-run', run_id, '1'), forward=False)}
        finally:
            catalog.close()

    @app.get('/v1/investigations/{run_id}/hypotheses')
    def hypotheses(run_id: str, request: Request, district: str):
        catalog, _record, geography = permitted_run(request, run_id, district)
        try:
            ledger = HypothesisLedger(catalog, request.state.principal, run_id, geography)
            return {'investigation_id': run_id, 'district_id': geography, 'history': ledger.history()}
        except ResearchInvalid:
            raise ApiError(422, 'RESEARCH_INVALID', 'Research scope is invalid') from None
        except CatalogIntegrityError:
            raise ApiError(409, 'INTEGRITY_FAILED', 'Research evidence requires integrity review') from None
        except PermissionError:
            raise auth.AuthorizationError('Research permission unavailable') from None
        finally:
            catalog.close()

    @app.post('/v1/investigations/{run_id}/hypotheses', status_code=201)
    def update_hypotheses(run_id: str, request: Request, body: LedgerWrite, district: str):
        catalog, _record, geography = permitted_run(request, run_id, district)
        try:
            ledger = HypothesisLedger(catalog, request.state.principal, run_id, geography)
            # Actor, tenant, trace, permission and snapshot hashes are server-bound.
            # The immutable revision is also the transactional write audit event.
            return ledger.append(body, request.headers.get('Idempotency-Key'), request.state.trace_id)
        except ResearchConflict:
            raise ApiError(409, 'REVISION_CONFLICT', 'Research revision or idempotency key conflicts') from None
        except ResearchInvalid:
            raise ApiError(422, 'RESEARCH_INVALID', 'Research evidence or hypothesis history is invalid') from None
        except CatalogIntegrityError:
            raise ApiError(409, 'INTEGRITY_FAILED', 'Research evidence requires integrity review') from None
        except PermissionError:
            raise auth.AuthorizationError('Research permission unavailable') from None
        finally:
            catalog.close()

    @app.post('/v1/investigations/{run_id}/agent-proposals')
    def agent_proposals(run_id: str, request: Request, body: AgentRunRequest, district: str):
        """Run one bounded research-agent task. Proposals are never persisted or certified here."""
        if agent_gateway is None:
            raise ApiError(503, 'AGENT_UNAVAILABLE', 'Research-agent provider is not configured')
        principal = request.state.principal
        geography = district or 'Rwanda'
        # Running an agent consumes provider budget, so require the creation permission in scope.
        auth.authorize(principal, 'investigation:create', principal.tenant, geography, profile=profile)
        catalog, _record, geography = permitted_run(request, run_id, geography)
        try:
            context = agents.context_for_investigation(
                catalog, principal, run_id, geography, sensitivity='restricted_aggregate',
                clearance=agent_clearance, local_only=agent_clearance is None)
            journal = JobStore(audit_path)
            try:
                return agents.ResearchAgent(agent_gateway, agents.Toolbox(), journal=journal).run(
                    body.role, body.question, context,
                    agents.Budget(max_steps=body.max_steps, max_repairs=body.max_repairs))
            finally:
                journal.close()
        except PolicyDenied:
            raise ApiError(403, 'AGENT_POLICY_DENIED', 'No provider satisfies the data policy') from None
        except agents.AgentViolation:
            raise ApiError(422, 'AGENT_INVALID', 'Research-agent task is invalid') from None
        except CatalogIntegrityError:
            raise ApiError(409, 'INTEGRITY_FAILED', 'Research evidence requires integrity review') from None
        except PermissionError:
            raise auth.AuthorizationError('Permission denied') from None
        finally:
            catalog.close()

    def report_store():
        if report_path is None:
            raise ApiError(503, 'REPORT_UNAVAILABLE', 'Report repository is not configured')
        return ReportStore(report_path)

    def artifact_store():
        if artifact_path is None:
            return None
        from .object_store import ContentAddressedStore
        return ContentAddressedStore(artifact_path)

    def audit_event(actor, action, detail):
        journal = JobStore(audit_path)
        try:
            journal.log(actor, action, detail)
        finally:
            journal.close()

    @app.post('/v1/reports/{report_id}/review')
    def review_report(report_id: str, request: Request, body: ReportReviewRequest):
        """One independent reviewer signs (or rejects) a frozen report. Reviewers never set checks.

        The reviewer must name the AST hash they reviewed; a changed or stale snapshot is refused
        with 409 before any signature is recorded."""
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', report_id):
            raise ApiError(404, 'NOT_FOUND', 'Report unavailable')
        store = report_store()
        try:
            rec = store.get(report_id, body.version)
            if body.report_ast_sha256 != rec.ast_sha256:
                raise ApiError(409, 'REPORT_CHANGED', 'Report snapshot changed; review the current version')
            principal = request.state.principal
            auth.authorize(principal, 'report:review', rec.tenant, rec.geography, author=rec.author, profile=profile)
            try:
                decision = store.review(report_id, body.version, principal.subject, principal.roles,
                                        body.decision, body.reason, profile=profile)
            finally:
                audit_event(principal.subject, 'report.review', {
                    'report_id': report_id, 'version': body.version, 'action': body.decision,
                    'report_ast_sha256': body.report_ast_sha256,
                    'outcome': 'recorded', 'trace_id': request.state.trace_id})
            return {'report_id': report_id, 'version': body.version,
                    'report_ast_sha256': body.report_ast_sha256,
                    'status': store.get(report_id, body.version).status,
                    'decision': {'status': decision.status, 'reasons': list(decision.reasons)}}
        except ReportAccessDenied as exc:
            raise _report_error(exc) from None
        except KeyError:
            raise ApiError(404, 'NOT_FOUND', 'Report unavailable') from None
        finally:
            store.close()

    @app.post('/v1/reports/{report_id}/publish')
    def publish_report(report_id: str, request: Request, body: ReportPublishRequest):
        """Publish an approved version. Only the publication authority may do this."""
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', report_id):
            raise ApiError(404, 'NOT_FOUND', 'Report unavailable')
        store = report_store()
        try:
            rec = store.get(report_id, body.version)
            principal = request.state.principal
            auth.authorize(principal, 'report:publish', rec.tenant, rec.geography, author=rec.author, profile=profile)
            try:
                store.publish(report_id, body.version, principal.subject, principal.roles,
                              artifacts=artifact_store(), profile=profile)
            except ReportAccessDenied:
                audit_event(principal.subject, 'report.publish_denied', {
                    'report_id': report_id, 'version': body.version, 'trace_id': request.state.trace_id})
                raise
            audit_event(principal.subject, 'report.publish', {
                'report_id': report_id, 'version': body.version, 'trace_id': request.state.trace_id})
            return {'report_id': report_id, 'version': body.version, 'status': 'published'}
        except ReportAccessDenied as exc:
            raise _report_error(exc) from None
        finally:
            store.close()

    @app.get('/v1/reports/{report_id}/export')
    def export_report(report_id: str, request: Request, version: str, format: str = 'pdf', district: str | None = None):
        """The only path to report bytes. Drafts, superseded and revoked versions never render."""
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', report_id) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,64}', version):
            raise ApiError(404, 'NOT_FOUND', 'Report unavailable')
        store = report_store()
        principal = None
        try:
            rec = store.get(report_id, version)
            principal = request.state.principal
            if principal.tenant != rec.tenant:
                # Cross-tenant access must be indistinguishable from a missing report.
                raise ApiError(404, 'NOT_FOUND', 'Report unavailable')
            auth.authorize(principal, 'investigation:read', rec.tenant, district or rec.geography, profile=profile)
            try:
                body, media_type = store.export(report_id, version, principal, format,
                                                artifacts=artifact_store(), profile=profile)
            except ReportAccessDenied:
                audit_event(principal.subject, 'report.export_denied', {
                    'report_id': report_id, 'version': version, 'format': format,
                    'trace_id': request.state.trace_id})
                raise
            audit_event(principal.subject, 'report.export', {
                'report_id': report_id, 'version': version, 'format': format,
                'ast_sha256': rec.ast_sha256, 'trace_id': request.state.trace_id})
            return Response(content=body, media_type=media_type, headers={
                'Content-Disposition': f'attachment; filename="{report_id}-{version}.{format}"',
                'X-Report-Ast-Sha256': rec.ast_sha256})
        except ReportAccessDenied as exc:
            raise _report_error(exc) from None
        except ValueError:
            raise ApiError(422, 'INVALID_FORMAT', 'Requested export format is not supported') from None
        finally:
            store.close()

    def _report_error(exc: ReportAccessDenied) -> ApiError:
        status = {'NOT_FOUND': 404, 'SUPERSEDED': 409, 'INTEGRITY': 409,
                  'NOT_RELEASED': 403, 'REVOKED': 403, 'NOT_APPROVED': 409,
                  'FORBIDDEN': 403, 'AMBIGUOUS_ROLE': 403, 'IMMUTABLE': 409}.get(exc.code, 403)
        messages = {'NOT_RELEASED': 'Report is not released', 'SUPERSEDED': 'A newer report version exists',
                    'REVOKED': 'Report was revoked', 'INTEGRITY': 'Report integrity check failed',
                    'NOT_FOUND': 'Report unavailable', 'NOT_APPROVED': 'Report is not approved',
                    'FORBIDDEN': 'Permission denied', 'AMBIGUOUS_ROLE': 'Reviewer role is ambiguous',
                    'IMMUTABLE': 'Report version is immutable'}
        return ApiError(status, exc.code, messages.get(exc.code, 'Report request denied'))

    # Admin endpoints for MFA Toggle (HACKATHON_DEMO only)
    class MfaToggleRequest(BaseModel):
        model_config = ConfigDict(extra='forbid')
        enabled: bool


    def _require_admin(principal, profile: ProfileConfig):
        """Check if principal has admin permission for MFA toggle."""
        if not profile.admin_mfa_toggle:
            raise ApiError(403, 'ADMIN_TOGGLE_NOT_ALLOWED', 'Admin MFA toggle not allowed for this profile')
        # Check for platform_admin role or specific admin role
        if 'platform_admin' not in principal.roles and 'admin' not in principal.roles:
            raise ApiError(403, 'FORBIDDEN', 'Admin permission required for MFA toggle')


    @app.get('/admin/mfa/status')
    async def mfa_status(request: Request):
        """Get current MFA status for admin panel."""
        profile = get_config()
        principal = request.state.principal
        _require_admin(principal, profile)
        return auth.get_mfa_status(profile)


    @app.post('/admin/mfa/toggle')
    async def mfa_toggle(request: Request, body: MfaToggleRequest):
        """Admin toggle to enable/disable MFA (HACKATHON_DEMO only)."""
        profile = get_config()
        principal = request.state.principal
        _require_admin(principal, profile)
        result = auth.set_mfa_enabled(body.enabled, profile)
        if not result['success']:
            raise ApiError(403, 'ADMIN_TOGGLE_FAILED', result['error'])
        return result

    return app


def configured_app():
    required = ('IREME_AUTH_ISSUER', 'IREME_AUTH_AUDIENCE', 'IREME_JWKS_URL', 'IREME_CATALOG_DB', 'IREME_JOBS_DB')
    if any(not os.environ.get(name) for name in required):
        raise RuntimeError('Governed API identity and persistence configuration required')
    verifier = auth.TokenVerifier(os.environ['IREME_AUTH_ISSUER'], os.environ['IREME_AUTH_AUDIENCE'],
                                  os.environ['IREME_JWKS_URL'])
    gateway = None
    if has_configured_keys(os.environ):
        from .gateway import Gateway, default_providers
        from .gateway_http import http_transport
        gateway = Gateway(default_providers(), http_transport, dict(os.environ))
    return create_app(verifier, os.environ['IREME_CATALOG_DB'], os.environ['IREME_JOBS_DB'],
                      agent_gateway=gateway, agent_clearance=os.environ.get('IREME_AGENT_CLEARANCE') or None,
                      report_path=os.environ.get('IREME_REPORTS_DB') or None,
                      artifact_path=os.environ.get('IREME_ARTIFACTS_DIR') or None)