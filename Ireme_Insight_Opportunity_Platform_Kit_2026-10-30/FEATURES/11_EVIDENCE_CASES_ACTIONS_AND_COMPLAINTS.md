# 11 Evidence Cases Actions And Complaints

**Outcome:** Connect evidence to field response, programme tasks and government case follow-up, replacing browser-only action requests.

**Primary actors:** analyst; programme owner; supervisor; field agent; member; government case officer

## Required user workflow

1. Analyst chooses an aggregate finding and creates a request for a scoped programme with evidence identifiers (not restricted raw microdata).
2. Programme owner accepts/declines with reason and assigns an accountable person, deadline and action type.
3. Agent completes authorized visit/training/milestone and attaches consented evidence; supervisor verifies.
4. Member can report incorrect information, late payment, poor field service or an unsafe request; dedicated caseworker responds.
5. Officer closes case after recorded outcome; original finding and all status transitions remain in immutable history.

## State machine

`submitted -> accepted/declined -> assigned -> in_progress -> completed/needs_review -> closed/appealed`

## Existing UI and proposed extension

Reuse AnalystRequests, Programme Requests tab, government issues view and agent task drawer; add case status and timeline, no new top-level navigation.

## Supabase entities and interfaces

operational_action_requests, action_request_events, support_cases, case_updates, evidence references, notifications.

## Hard business and security rules

- Store actions in Supabase not localStorage; enforce programme+area+case assignment permissions.
- No automated case closure based solely on image or AI text.
- Do not leak beneficiary identifying information into an analyst's general statistics workspace.
- Respect complaint privacy, correction and appeal rights.

## Feature acceptance tests

- [ ] A request by analyst appears for correct programme manager in a separate signed-in session.
- [ ] Wrong programme and district actors cannot see it.
- [ ] Visit evidence and supervisor decision appear on authorized timeline.
- [ ] Reopening a closed case retains its full historical record.

## Required implementation artifacts

- Git diff and UI screenshots for desktop/tablet/mobile.
- API/Edge contract with unauthorized/failure responses.
- Migration and RLS positive+negative tests.
- Idempotency/retry and audit behavior if money or evidence is handled.
- Demonstration vs production labeling and provider/blocker status.
