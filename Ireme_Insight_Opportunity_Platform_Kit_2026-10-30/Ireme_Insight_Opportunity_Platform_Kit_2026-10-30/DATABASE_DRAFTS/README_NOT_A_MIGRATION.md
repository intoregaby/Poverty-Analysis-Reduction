# Database Drafts — Review Required

**NOT run or deployed during ZIP creation.** The following SQL provides a proposed additive schema and deliberately restricted grants/policies. It is NOT a finished production migration. It must be reconciled with the current active `ireme-program` PostgreSQL schema, existing custom enums/functions, existing RLS policies, and validated using the installed Supabase CLI and local test DB.

1. Confirm `supabase --version`; review `supabase migration new --help` before creating a migration file. Never insert a guessed migration version.
2. Read and export current schema, migrations, role grants, and all RLS. Capture a rollback/restore baseline; do not drop/rename existing member/agent/cooperative tables.
3. Review `01_additive_tables_DRAFT.sql` in an isolated transaction. Evaluate table references, FK type compatibility, constraints, indexes, naming and extended domains.
4. Review `02_rls_examples_DRAFT.sql`; these samples intentionally deny almost all browser direct mutations. Production grants and policies must be built per role, not generic authenticated.
5. Ensure all public tables have RLS and safe grants. Audit Edge Function execution role and storage.objects policies. Re-run Supabase advisors.
6. Use SQL / PgTAP and integration tests for cross-tenant and privilege abuse.
7. Generate actual forward migration with native CLI, code review, local test, then authorized staged deploy. No hosted writes are authorized by this kit.

**Caution:** This draft is an architectural reference, not a turnkey one-click backend.
