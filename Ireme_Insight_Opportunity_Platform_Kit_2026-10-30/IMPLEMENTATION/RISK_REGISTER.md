# Principal Release Risks and Controls

| Risk ID | Severity | Problem | Required mitigation |
| --- | --- | --- | --- |
| R-01 | Critical | A programme falsely shows payments or wages as settled after a button click | Provider-authentic reconciliation and no simulated-success production state |
| R-02 | Critical | Browser demo role or missing profile escalates to analyst/admin | Verified server auth + RLS + deny missing profiles |
| R-03 | Critical | Government or agent accesses private household/financial records | scoped grants, SQL RLS, audited short-lived signed media, privacy review |
| R-04 | High | Agent claims livelihood success based on one picture | member confirmation, independent review and baseline/outcome labels |
| R-05 | High | Missing provider/legal authority for account opening, lending or payment | integration disabled; status and alternative pathways clear |
| R-06 | High | Reused event creates duplicate benefit or wage payments | idempotency, provider reconciliation, ledger entries and concurrency lock |
| R-07 | High | Agent without verified job contract assigned vulnerable families | hiring, identity, competency and induction gate |
| R-08 | High | Generated demo district sample shown as national population evidence | demo-isolation, source state, denominators, source-specific filters |
| R-09 | High | Unsafe children/household photo collection or unexpected exposure | optional evidence, informed consent, private storage, limited retention |
| R-10 | High | Destructive migration breaks USSD/member/cooperative capabilities | forward-only migrations, isolated tests, staged flags, rollback |
| R-11 | Medium | Poor connectivity loses evidence or duplicates visits | idempotent offline queue, tests, safe conflict handling |
| R-12 | Medium | Unreconciled fundraising data presented as cash available | grant/investment restrictions, separate statuses, reconciled records |
| R-13 | Medium | Exports too complex for policy makers | simple KPI cards, clear units, charts and explanations |
| R-14 | Medium | Programme automatic eligibility rejects disadvantaged groups | human decision, published rules, appeals, accessibility |
| R-15 | Medium | Agent payroll/beneficiary transfer data used to claim poverty reduction | independent outcome measurement, survey vs admin separation |
