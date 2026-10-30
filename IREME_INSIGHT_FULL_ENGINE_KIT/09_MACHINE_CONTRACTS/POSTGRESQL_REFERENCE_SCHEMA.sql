-- REFERENCE SQL BLUEPRINT, not executed against a database.
-- Use governed migrations, database roles/RLS, encryption and license retention policies before production.
CREATE TABLE datasets (
  dataset_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  license_policy_id TEXT NOT NULL,
  sensitivity TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, version, sha256)
);
CREATE TABLE indicator_definitions (
  indicator_id TEXT NOT NULL,
  definition_version TEXT NOT NULL,
  definition_json JSONB NOT NULL,
  definition_sha256 TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(indicator_id, definition_version)
);
CREATE TABLE investigations (
  investigation_id UUID PRIMARY KEY,
  district_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  dataset_id UUID NOT NULL REFERENCES datasets(dataset_id),
  state TEXT NOT NULL,
  input_sha256 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE calculated_facts (
  fact_id UUID PRIMARY KEY,
  investigation_id UUID NOT NULL REFERENCES investigations(investigation_id),
  indicator_id TEXT NOT NULL,
  definition_version TEXT NOT NULL,
  estimate_json JSONB NOT NULL,
  origin_sha256 TEXT NOT NULL,
  scientific_verdict TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY(indicator_id, definition_version) REFERENCES indicator_definitions(indicator_id, definition_version)
);
CREATE TABLE official_documents (
  document_id UUID PRIMARY KEY,
  authority TEXT NOT NULL,
  source_url TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  release_version TEXT NOT NULL,
  retrieval_status TEXT NOT NULL,
  retrieval_metadata JSONB NOT NULL,
  UNIQUE(authority, sha256)
);
CREATE TABLE official_facts (
  official_fact_id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES official_documents(document_id),
  table_coordinate TEXT NOT NULL,
  reference_json JSONB NOT NULL,
  origin_sha256 TEXT NOT NULL
);
CREATE TABLE evidence_comparisons (
  comparison_id UUID PRIMARY KEY,
  fact_id UUID NOT NULL REFERENCES calculated_facts(fact_id),
  official_fact_id UUID REFERENCES official_facts(official_fact_id),
  status TEXT NOT NULL,
  match_metadata JSONB NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE reports (
  report_id UUID PRIMARY KEY,
  investigation_id UUID NOT NULL REFERENCES investigations(investigation_id),
  report_version INTEGER NOT NULL,
  ast_json JSONB NOT NULL,
  ast_sha256 TEXT NOT NULL,
  lifecycle TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(investigation_id,report_version)
);
CREATE TABLE approvals (
  approval_id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(report_id),
  report_ast_sha256 TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  reviewer_role TEXT NOT NULL,
  action TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE workflow_events (
  event_id UUID PRIMARY KEY,
  investigation_id UUID REFERENCES investigations(investigation_id),
  report_id UUID REFERENCES reports(report_id),
  actor_id TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  event_json JSONB NOT NULL,
  previous_hash TEXT,
  event_hash TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- TODO in real implementation: RLS, append-only enforcement, policies, archival,
-- provenance FK for source coordinates, eligibility permissions, indices and audited migrations.
