# 02 Agent Jobs Recruitment And Pay

**Outcome:** Create genuine paid employment opportunities for qualified job seekers and recruit them as field agents who can help programme members implement livelihood projects.

**Primary actors:** job applicant; programme HR/recruiter; assessor; supervisor; agent; financial reviewer

## Required user workflow

1. Programme manager creates vacancy with pay basis, contract duration, district/sector, role duties, skill requirements, training, safeguarding obligations and transparent selection criteria.
2. Applicant signs in, completes education/experience/skills/competency profile, applies, uploads only necessary documents and receives receipt.
3. Human recruiter shortlists based on published criteria; qualified assessor administers practical, role-relevant demonstration (business skills, teaching/communication, bookkeeping, digital literacy, safety and local language).
4. Interview is scheduled; applicant receives an accessible notice; human decision recorded with conflict checks, reasoning and appeal route.
5. Accepted applicant signs agreement as a paid agent, completes induction, is tied to programme/organisation and allowed a scoped assignment; payroll becomes a separately approved obligation.
6. Agent's approved payable, approved wage, paid wage and outstanding balance are visible to authorized HR/paymaster and to the agent themselves.

## State machine

`vacancy draft -> approved -> published -> closed; application applied -> screened -> assessment -> interview -> offered/rejected -> contracted -> inducted; payroll draft -> approved -> payable -> submitted -> settled/failed`

## Existing UI and proposed extension

Upgrade JobsTab, JobApplicant, AgentsTab and Agent360; show job details, vacancy status, assessment rubric, timeline, hiring queue, contract/earnings status.

## Supabase entities and interfaces

agent_job_postings, agent_job_applications, applicant_competencies, applicant_documents, candidate_assessments, interview_slots, agent_contracts, agent_training, agent_payroll_runs and ledger obligation references.

## Hard business and security rules

- Don't infer employment eligibility from graduation alone; verify applicable age/work rules and parental/guardian consent where relevant under local law.
- Fair, accessible recruitment: practical demonstration or equivalent knowledge evidence, no unjustified degree filter; human decisions only.
- Role activation requires real contract + induction + supervisor confirmation; don't trust applicant to edit `profiles.role`.
- Never display 'wage paid' unless matched to provider-confirmed settlement.

## Feature acceptance tests

- [ ] A published position appears on job-seeker's portal with valid future deadlines and requirements.
- [ ] Applicant can apply once and follow status; competing applicant cannot read records.
- [ ] Recruiter can schedule assessment/interview and record human decision and reason.
- [ ] Hiring creates a scoped agent assignment entitlement, not an unrestricted programme role.
- [ ] Pay run approval and provider confirmation are independently visible; retry never duplicates a payment.

## Required implementation artifacts

- Git diff and UI screenshots for desktop/tablet/mobile.
- API/Edge contract with unauthorized/failure responses.
- Migration and RLS positive+negative tests.
- Idempotency/retry and audit behavior if money or evidence is handled.
- Demonstration vs production labeling and provider/blocker status.
