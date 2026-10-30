# Platform Roles, Boundaries and Security Matrix

Existing roles in `src/lib/roles.js` and hosted `profiles.role`: `platform_admin`, `nisr_analyst`, `programme_owner`, `cooperative`, `gov_district`, `gov_sector`, `gov_cell`, `field_agent`, `beneficiary`, `job_applicant`.

**Do not create an unrestricted government superuser.** Define an explicit scoped read authority and audit trail; aggregate government reporting does not expose raw household finance or media.

| Role | Allowed | Forbidden / restricted |
| --- | --- | --- |
| Platform Admin | system configuration, reviewed org/user onboarding, audit controls | ordinary unrestricted viewing of household-sensitive files; business payment approval without assigned authority |
| NISR Analyst | sourced official/aggregated data, district investigation, safe aggregated outputs, program action recommendations | changing programme payments, viewing respondent bank details or deciding household entitlement |
| Programme Owner | own org/programmes, jobs, selection, assignments, approved enrollments, payment workflow, training/outcome reviews | cross-organization household records, authorizing own unreviewed payout, approving their own evidentiary claim without checks |
| District Officer | approved district aggregates, referral queues, scoped program delivery, assignment oversight where mandated | all national beneficiaries' raw records, unrestricted bank histories, hidden employer HR data |
| Sector/Cell Leader | assigned local service cases/aggregate summaries with progressively smaller scope | raw records outside scoped geography or partner programmes; broad photo browsing |
| Field Agent | assigned members and tasks, training plans, milestone submissions, optional offline visit records | self-assign members, edit verified evidence, certify own outcomes, initiate transfers, access other agents' families |
| Programme Member | own enrollments, payments statuses, training plans, project/evidence consent, referrals, complaints | other members' records; provider secrets; delegated agent actions without authorization |
| Job Applicant | public jobs, own application and assessment results, appeal/status | employer-private notes, other candidates or records |
| Cooperative Officer | their cooperative's authorized ledger, voluntary group member records and referrals | government/other organizations' transactions, unconsented private family data |
| Funder / Government Auditor (new, scoped) | approved financial programme summaries, audit-ready supporting records under documented mandate | private photo/beneficiary detail by default; funds or report data outside agreement and oversight scope |
| Financial Reviewer/Paymaster (new delegated permission) | approve and reconcile specific payment batches under separate approval | own submissions, unmatched provider events, benefit adjudication without authority |
| Field Supervisor (new delegated permission) | review verified submissions and approve assignments within programme | certify own submitted cases; inspect unrelated households |

## Authority model

Use existing `profiles.role` to select the main navigation role, plus **DB-backed** scoped `programme_org_memberships` and `delegated_permissions` (or consolidated equivalent). Claims in mutable frontend state or `raw_user_meta_data` are never authoritative. Verify `auth.uid()` and organization/area link; require `WITH CHECK` as well as `USING` for updates. Program roles may span multiple programmes, so use relations, not a single `profiles.programme` string, for security.

## Minimum policy tests

- Applicant A cannot view B's application, reviewer notes or credentials.
- Agent A cannot read member assigned to Agent B, or access a private evidence image by guessing URL.
- Programme Owner A cannot see payments or funding contracts of Programme Owner B, even if district matches.
- District officer cannot view another district's personally identifiable cases; no unsuppressed individual data in analytics.
- Beneficiary may view their own verified support status but cannot change provider settlement or income verifier status.
- Admin UI role selected in demo browser localStorage cannot affect production DB permissions.
- An expired/revoked user session cannot continue approving protected financial operations.
- Public job search returns only approved published postings, excludes candidate applications and salaries where private.

## Governance

Apply legal authority, consent where applicable, purpose limitation, retention, withdrawal/rectification, cross-organizational sharing agreements, audit reviews. For government reporting, supply aggregate thresholds/suppression, metadata and lawful need-to-know. See `ARCHITECTURE/PRIVACY_SAFEGUARDING_AND_FINANCE.md`.
