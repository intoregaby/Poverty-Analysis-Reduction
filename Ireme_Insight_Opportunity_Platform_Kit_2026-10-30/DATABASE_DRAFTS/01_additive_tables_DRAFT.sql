-- DRAFT ONLY. Not executed, not a migration. Inspect existing schema before adapting.
-- Existing: public.profiles, public.members, public.agents, public.agent_assignments,
-- public.visits, public.cooperatives. Do not replace them.

CREATE TABLE IF NOT EXISTS public.programme_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 1),
  legal_kind text NOT NULL CHECK (legal_kind IN ('government','ngo','cooperative','partner')),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.programme_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.programme_organizations(id),
  name text NOT NULL,
  purpose text NOT NULL,
  district_code text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','active','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.programme_org_memberships (
  organization_id uuid NOT NULL REFERENCES public.programme_organizations(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  delegated_role text NOT NULL CHECK (delegated_role IN ('org_admin','hr','recruiter','field_supervisor','programme_manager','paymaster','financial_reviewer','auditor')),
  district_scope text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id, delegated_role)
);
CREATE TABLE IF NOT EXISTS public.programme_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programme_catalog(id),
  member_id uuid NOT NULL REFERENCES public.members(id),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','active','declined','exited')),
  decision_note text,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programme_id, member_id)
);
CREATE TABLE IF NOT EXISTS public.agent_job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programme_catalog(id),
  title text NOT NULL,
  description text NOT NULL,
  district_code text,
  required_competencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  slots integer NOT NULL CHECK (slots > 0 AND slots <= 10000),
  salary_terms text, -- contract terms are not a bank settlement record
  closes_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','published','closed','cancelled')),
  published_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.agent_job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid NOT NULL REFERENCES public.agent_job_postings(id),
  applicant_user_id uuid NOT NULL REFERENCES auth.users(id),
  competency_statement text NOT NULL CHECK (length(competency_statement) <= 3000),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','screening','assessment','interview','offered','rejected','contracted','withdrawn')),
  decision_reason text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (posting_id,applicant_user_id)
);
CREATE TABLE IF NOT EXISTS public.candidate_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.agent_job_applications(id),
  assessed_by uuid NOT NULL REFERENCES auth.users(id),
  rubric_version text NOT NULL,
  competency_scores jsonb NOT NULL,
  reviewer_note text,
  assessed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.agent_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.agent_job_applications(id),
  agent_id uuid REFERENCES public.agents(id),
  programme_id uuid NOT NULL REFERENCES public.programme_catalog(id),
  status text NOT NULL CHECK (status IN ('offered','signed','active','completed','terminated')),
  signed_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.livelihood_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.programme_enrollments(id),
  assigned_agent_id uuid REFERENCES public.agents(id),
  activity_name text NOT NULL,
  member_goals text NOT NULL,
  baseline_summary text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','approved','active','paused','completed','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.training_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.livelihood_plans(id),
  agent_id uuid NOT NULL REFERENCES public.agents(id),
  skill_code text NOT NULL,
  status text NOT NULL CHECK (status IN ('scheduled','attended','demonstrated','cancelled')),
  member_confirmed_at timestamptz,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.livelihood_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.livelihood_plans(id),
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  milestone_type text NOT NULL CHECK (milestone_type IN ('training','first_activity','production','first_sale','continuation','other')),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','member_confirmed','verified','rejected','disputed')),
  event_uuid uuid NOT NULL UNIQUE,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.field_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.livelihood_milestones(id),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  storage_path text NOT NULL UNIQUE,
  content_sha256 text NOT NULL CHECK (length(content_sha256) = 64),
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('photo','receipt','supervisor_note','document')),
  consent_reference text, -- link to formal consent record in final design
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','accepted','rejected','revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.supervisor_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.livelihood_milestones(id),
  reviewer_user_id uuid NOT NULL REFERENCES auth.users(id),
  decision text NOT NULL CHECK (decision IN ('verified','rejected','needs_more_evidence')),
  reasoning text NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.financial_access_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id),
  programme_id uuid REFERENCES public.programme_catalog(id),
  referral_type text NOT NULL CHECK (referral_type IN ('bank_account','mobile_money','credit_information')),
  provider_name text,
  masked_reference text,
  consent_recorded_at timestamptz,
  status text NOT NULL DEFAULT 'interested' CHECK (status IN ('interested','consented','submitted','provider_confirmed','rejected','withdrawn','unavailable')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.funding_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programme_catalog(id),
  source_name text NOT NULL,
  funding_type text NOT NULL CHECK (funding_type IN ('grant','investment','loan','government_allocation','other')),
  currency text NOT NULL DEFAULT 'RWF' CHECK (currency ~ '^[A-Z]{3}$'),
  agreed_amount numeric(18,2) NOT NULL CHECK (agreed_amount >= 0),
  restrictions text,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','signed','active','closed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.programme_financial_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programme_catalog(id),
  obligation_kind text NOT NULL CHECK (obligation_kind IN ('member_support','agent_wage','training','materials','operating_cost')),
  recipient_member_id uuid REFERENCES public.members(id),
  recipient_agent_id uuid REFERENCES public.agents(id),
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'RWF' CHECK (currency ~ '^[A-Z]{3}$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','payable','cancelled')),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((obligation_kind = 'member_support' AND recipient_member_id IS NOT NULL AND recipient_agent_id IS NULL)
      OR (obligation_kind = 'agent_wage' AND recipient_agent_id IS NOT NULL AND recipient_member_id IS NULL)
      OR (obligation_kind IN ('training','materials','operating_cost') AND recipient_member_id IS NULL AND recipient_agent_id IS NULL))
);
CREATE TABLE IF NOT EXISTS public.payment_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id uuid NOT NULL REFERENCES public.programme_financial_obligations(id),
  client_idempotency_key uuid NOT NULL UNIQUE,
  provider_code text,
  provider_reference text,
  state text NOT NULL DEFAULT 'created' CHECK (state IN ('created','submitted','acknowledged','settled','failed','reversed','disputed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  UNIQUE (provider_code,provider_reference)
);
CREATE TABLE IF NOT EXISTS public.provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_instruction_id uuid NOT NULL REFERENCES public.payment_instructions(id),
  provider_code text NOT NULL,
  provider_event_id text NOT NULL,
  provider_event_type text NOT NULL,
  event_time timestamptz,
  verified_signature boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_code,provider_event_id)
);
CREATE TABLE IF NOT EXISTS public.financial_ledger_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programme_catalog(id),
  reference_type text NOT NULL,
  reference_id uuid,
  currency text NOT NULL DEFAULT 'RWF' CHECK (currency ~ '^[A-Z]{3}$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
  posted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.financial_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES public.financial_ledger_journals(id),
  account_code text NOT NULL,
  side text NOT NULL CHECK (side IN ('debit','credit')),
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.operational_action_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programme_catalog(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  district_code text,
  subject text NOT NULL,
  source_evidence_id text, -- safe aggregate reference only, no raw survey rows
  state text NOT NULL DEFAULT 'submitted' CHECK (state IN ('submitted','accepted','declined','in_progress','completed','closed','appealed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.operational_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id),
  entity_kind text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  source_status text NOT NULL CHECK (source_status IN ('demo','recorded','pending_review','verified','provider_confirmed','disputed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS and grants: enable immediately for ALL exposed new tables.
DO $$
DECLARE tab text;
BEGIN
  FOREACH tab IN ARRAY ARRAY[
   'programme_organizations','programme_catalog','programme_org_memberships','programme_enrollments',
   'agent_job_postings','agent_job_applications','candidate_assessments','agent_contracts',
   'livelihood_plans','training_events','livelihood_milestones','field_evidence',
   'supervisor_verifications','financial_access_referrals','funding_agreements',
   'programme_financial_obligations','payment_instructions','provider_events',
   'financial_ledger_journals','financial_ledger_entries',
   'operational_action_requests','operational_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tab);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated',tab);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS ix_catalog_org ON public.programme_catalog (organization_id,status);
CREATE INDEX IF NOT EXISTS ix_posting_programme ON public.agent_job_postings (programme_id,status,closes_at);
CREATE INDEX IF NOT EXISTS ix_application_posting ON public.agent_job_applications (posting_id,status);
CREATE INDEX IF NOT EXISTS ix_enroll_programme ON public.programme_enrollments (programme_id,status);
CREATE INDEX IF NOT EXISTS ix_milestone_plan ON public.livelihood_milestones (plan_id,status);
CREATE INDEX IF NOT EXISTS ix_event_instruction ON public.provider_events (payment_instruction_id,received_at);
CREATE INDEX IF NOT EXISTS ix_action_programme ON public.operational_action_requests (programme_id,state);

-- Important: Real production policies/RPC scopes MUST be designed, added and tested
-- before enabling operational browser writes. See 02_rls_examples_DRAFT.sql.
