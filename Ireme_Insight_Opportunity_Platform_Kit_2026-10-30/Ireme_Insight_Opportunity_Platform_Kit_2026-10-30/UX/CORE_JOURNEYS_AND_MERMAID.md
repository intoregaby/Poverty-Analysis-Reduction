# End-to-End Workflows (Mermaid)

## Opportunity-to-livelihood

```mermaid
flowchart TD
    A[Programme budget and staff plan] --> B[Publish paid agent vacancies]
    B --> C[Applicant applies with skills]
    C --> D[Human assessment and interview]
    D --> E{Eligible and selected?}
    E -- No --> F[Reason and fair appeal]
    E -- Yes --> G[Contract and induction]
    G --> H[Supervisor assigns members]
    H --> I[Member chooses goals and consent]
    I --> J[Agent teaches practical skills]
    J --> K[Agent helps implement livelihood]
    K --> L[Consented evidence or alternative proof]
    L --> M{Independent supervisor review}
    M -- More evidence --> K
    M -- Verified --> N[Follow-up and recorded outcome]
    N --> O[Programme operational aggregate]
    O --> P[Authorised government oversight]
```

## Finance and inclusion

```mermaid
flowchart TD
    A[Donor grant or investment agreement] --> B[Approved programme allocation]
    B --> C{Approved obligation?}
    C -- Support --> D[Member support payable]
    C -- Employment --> E[Agent wage payable]
    D --> F[Provider transfer request]
    E --> F
    F --> G{Authenticated provider event}
    G -- Settled --> H[Reconciled settlement in ledger]
    G -- Failed --> I[Exception and correction case]
    H --> J[Aggregated scoped financial report]
    I --> J
    K[Member requests account help] --> L[Consent and provider referral]
    L --> M[Provider confirms or rejects]
    M --> N[Member sees true account-referral status]
    N --> F
```

## Evidence-to-action with the existing AI Engine

```mermaid
flowchart LR
    A[Published NISR statistics] --> B[Existing AI Engine investigation]
    B --> C[Verified aggregate finding or restricted draft]
    C --> D[Scoped human action request]
    D --> E[Programme manager accepts and assigns]
    E --> F[Agent practical training and implementation]
    F --> G[Independent field verification]
    G --> H[Programme outcome monitoring]
    H --> I[Operational report with source status]
```

**Rule:** a restricted AI Engine draft cannot become an official claim simply because it was copied to an operational report.
