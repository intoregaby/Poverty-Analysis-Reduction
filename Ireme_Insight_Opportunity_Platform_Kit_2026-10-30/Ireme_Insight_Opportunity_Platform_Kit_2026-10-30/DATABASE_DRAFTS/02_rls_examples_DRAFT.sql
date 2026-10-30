-- DRAFT ONLY. Illustrative narrowly-scoped policies for public job discovery and own application.
-- Requires 01_additive_tables_DRAFT.sql in isolated local DB. Review policy composition and grants.

-- Public visitors can see approved published vacancies that have not closed.
GRANT SELECT ON public.agent_job_postings TO anon, authenticated;
CREATE POLICY "published job listings readable" ON public.agent_job_postings
FOR SELECT TO anon, authenticated
USING (status = 'published' AND (closes_at IS NULL OR closes_at > now()));

-- An authenticated applicant may read only their own submitted application.
GRANT SELECT, INSERT ON public.agent_job_applications TO authenticated;
CREATE POLICY "applicant reads own applications" ON public.agent_job_applications
FOR SELECT TO authenticated
USING (applicant_user_id = (SELECT auth.uid()));

-- Write only through server-side guarded API is preferred for real deployment;
-- sample policy illustrates ownership + initial status, not legal age/eligibility checks.
-- **DO NOT ENABLE THIS POLICY IN PRODUCTION WITHOUT POSTING STATUS VALIDATION AND ABUSE CONTROLS.**
-- CREATE POLICY "applicant creates self application" ON public.agent_job_applications
-- FOR INSERT TO authenticated
-- WITH CHECK (applicant_user_id = (SELECT auth.uid()) AND status = 'submitted');

-- All other tables deliberately remain inaccessible to `anon` and `authenticated`
-- by default. An Edge Function or narrowly guarded SECURITY INVOKER procedure can
-- implement approved writes. Never solve this by creating a broad SELECT USING(true)
-- on PII, finances or evidence. Review RLS recursion and helper scopes.

-- Additional policies to implement after role matrix approval:
-- org HR reads only applicant records for job postings owned by their org.
-- agent reads only tasks/milestones for active, assigned members in their programmes.
-- member reads own enrollment, payment status and projects.
-- supervisor reads evidence for exactly assigned scope and may review others' submissions.
-- paymaster can initiate approved payment only if not original approver.
-- government sees approved aggregates, not ledger detail by default.
-- consented media read uses short-lived signed URLs after server authorization.
