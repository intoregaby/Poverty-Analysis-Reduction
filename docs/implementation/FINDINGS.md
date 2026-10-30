# Findings requiring human decision

**F-003 (2026-10-30, hosted database, remediated guard; broader review pending).** In project
ywtxpsefbqzmgmdfzldp, assign_agent/reassign_agent checked a nullable profile role under NOT without
COALESCE. A signed-in subject with no profile bypassed the guard; the pre-fix rolled-back regression
reached the private assignment helper and raised Member not found rather than insufficient_privilege.
Migration fail_closed_assignment_authorization makes authorization null-safe and allows subjectless
automation only under the actual service_role database role. Six post-fix denied-call checks pass;
the existing profile role-update trigger also remains present. No live beneficiary mutations were used.
This does not validate privileged business behavior, hosted login/MFA/session revocation or the whole
RLS policy system. Hosted advisors still report eleven authenticated SECURITY DEFINER RPC exposures
and disabled leaked-password protection. See evidence/supabase_authorization_cycle_2026_10_30.json.

**F-002 (2026-10-30, acceptance evidence correction).** Earlier verification reports labelled passing
tagged tests as scenario PASS even when they exercised only a component and the production/application
integration remained absent. Overall completion was already denied by workstream/audit gates, but the
per-scenario labels overstated acceptance coverage. The verifier now reports COMPONENT_ONLY until an
explicit acceptance-scoped integration mapping is established. Prior numerical test results remain
historical evidence; they are not reclassified as completed production acceptance. No kit scenario or
expected result has been removed or relaxed.

**F-001 (2026-10-30, real data).** Licensed EICV7 microdata reproduces NISR Table A9.23 closely but not exactly. Of 31 domains
(Rwanda + 30 districts), 23 agree with the published point estimate within published rounding (0.005 pp); **8 do not**:
Rwanda (+0.011), Gisagara (+0.054), Kamonyi (+0.045), Nyabihu (-0.203), Nyamasheke (+0.135), Burera (+0.247),
Rwamagana (-0.027), Ngoma (-0.043). Standard errors agree to within 0.067 pp everywhere. Candidate causes (NOT yet tested):
the supplied file is a later/earlier weight or consumption revision than the published table; district-level re-estimation.
The engine therefore classifies these as `external_mismatch` and they block unrestricted release until a statistician
explains or reconciles them. Full per-domain numbers: `evidence/eicv7_vs_nisr_table_a9_23.json`.
