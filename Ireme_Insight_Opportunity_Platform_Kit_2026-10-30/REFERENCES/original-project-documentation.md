# [Platform Name]: Full Project Documentation

**Competition:** National Institute of Statistics of Rwanda (NISR) Challenge
**Platform name:** To be decided (shown as [Platform Name] in this document)
**Team:** Ireme Soft Hub
**Document version:** 1.0
**Date:** 20 October 2026

---

## Table of Contents

1. Project Summary
2. The Problem
3. Goals and Success Measures
4. Who Uses the Platform
5. The Six Panels
6. How Money Flows
7. The Three Groups of Beneficiaries
8. Financial Usage Map and Problem Spots
9. Roles and Access Rules
10. Data Design (Tables)
11. NISR Data Plan
12. USSD Design
13. Agent Work and Offline Mode
14. Security, Privacy and Trust
15. Fraud Prevention
16. Technology and Architecture
17. Main Screens and Features by Panel
18. Notifications and Languages
19. Build Plan (6 Weeks)
20. Testing Plan
21. Demo Story for the Judges
22. Risks and Answers
23. Future Growth
24. Glossary
25. Open Questions

---

## 1. Project Summary

[Platform Name] is one national platform for managing every social support program in Rwanda, from the national level down to each person.

Programs such as VUP and Girinka Munyarwanda, and programs run by NGOs, register on the platform. They enroll their beneficiaries, pay them through a bank or mobile money account, and hire field agents. The government can see where every franc goes. NISR data powers the statistics so that decisions are based on facts.

The platform reaches every kind of person:

- People with a smartphone use the web or mobile app.
- People with a basic phone use USSD.
- People with no phone and no internet are helped in person by a field agent.

The platform also does three extra things:

1. It creates jobs for young people who work as agents.
2. It pushes poor families to open bank or mobile money accounts (financial inclusion).
3. It shows on a map where poverty and money problems are, so help goes to the right places.

---

## 2. The Problem

- Programs work separately. Nobody sees the full picture of who gets what.
- It is hard to follow funds from the source to the family.
- Some poor families get many programs while others get none.
- Many of the poorest people have no bank account, no phone, or no digital skills.
- Local leaders do not have simple tools to follow their own people.
- Many young people have no work, while programs need field staff.
- Money given to families can be lost to harmful spending such as betting, and nobody can see this early.

---

## 3. Goals and Success Measures

| Goal | How we measure it |
|---|---|
| Full view of every program | Number of programs registered and active |
| Reach every beneficiary | Percentage of beneficiaries who received their payment |
| Fewer people left out | Percentage of poor families inside at least one program, per area |
| More people using banks | Number of beneficiaries with a bank or mobile money account |
| More jobs | Number of agent jobs posted, filled and completed |
| Better spending | Share of money spent on food, school, health, farming and savings |
| Faster response | Time from a problem spot appearing to action being taken |
| Better decisions | Number of reports exported and used by leaders |

---

## 4. Who Uses the Platform

| User | What they do |
|---|---|
| NISR or national analyst | Studies statistics and poverty trends, exports reports |
| Program owner (for example VUP) | Registers the program, enrolls people, posts agent jobs |
| Cell leader | Sees and follows people in their cell |
| Sector leader | Sees all cells in their sector |
| District officer | Sees all sectors, cells and programs in their district |
| Agent | Visits and helps beneficiaries in one program |
| Beneficiary | Receives funds, checks payments, reports problems |
| Job applicant | Looks for agent jobs and applies |
| Platform admin | Manages the system, users and settings |

---

## 5. The Six Panels

### Panel 1: Statistics Panel

**Purpose:** Show the NISR data after it has been cleaned and saved, so users can understand poverty and employment.

**Features**

- Poverty levels by district, sector and cell
- Employment and unemployment numbers
- Program coverage (who is reached and who is missed)
- Jobs created through the platform
- Charts: bar, line, pie, and comparison by year
- Filters by year, area, program and group
- Reports: download as PDF and Excel
- Data import page where an admin uploads new NISR files

**Scenario:** An analyst opens the panel and sees that Nyamagabe has high poverty but low program coverage. She exports a report in one click and sends it to the ministry.

### Panel 2: Program Panel

**Purpose:** Where programs register and run their work. This panel also handles agent jobs. There is no separate jobs panel.

**Part A: Program management**

- Register the program: name, goal, budget, who qualifies, areas covered
- Set rules and payment amounts and dates
- Enroll beneficiaries
- See the full 360 view of the program
- See money sent, money received and money spent

**Part B: Agent jobs**

- Post an agent job: location, number of agents, duties, deadline
- See applicants with their details and school level
- Accept or reject applicants
- Assign accepted agents to areas and to the people they must visit
- Track agent performance: visits done, people reached, problems found
- Close the job when enough agents are hired

**How applicants get in:** Job seekers create a simple applicant account, browse open jobs from all programs and apply by phone. When a program accepts someone, the account becomes an Agent account tied to that one program only.

**Scenario:** The VUP team posts 30 agent jobs for Rubavu. Eighty graduates apply in one week. VUP accepts 30, gives each agent a list of villagers to visit, and watches their visits each week. One agent who logs nothing for two weeks is flagged and replaced.

### Panel 3: Government Panel (District, Sector, Cell)

**Purpose:** Let each level of government see and follow their own area.

| Level | What they see |
|---|---|
| Cell | Only their own cell |
| Sector | Their sector and all cells inside it |
| District | Their district, all sectors, all cells, and all programs inside it |

Each leader gets the 360 view of every person and every program in their area. The district controls the sectors and cells under it.

**Features**

- List and search of beneficiaries in the area
- 360 view of one person: programs, payments, visits, complaints
- 360 view of one program in the area
- Missing payment list
- Agent activity in the area
- Problem spots in the area
- Send a task or message to a lower level

**Scenario:** A district officer opens VUP and sees 2,000 beneficiaries. She finds that 120 people did not receive their payment this month and sees which sector they belong to. She calls that sector leader the same day.

### Panel 4: Agent Dashboard (Inspector Dashboard)

**Purpose:** Let field agents control and help the people in their program, especially those with no phone or no internet.

**Rules**

- An agent belongs to one program only. A VUP agent cannot see Girinka Munyarwanda data.
- An agent sees only the people assigned to them.

**Features**

- List of assigned people, with the hardest cases first (no phone, no internet, no account)
- Visit form: confirm the person received funds, add notes, take a photo, save the GPS location
- Help the person open a bank or mobile money account
- Act for a person with no phone, with their consent
- Record problems and complaints
- Work offline and sync when the internet returns
- Weekly summary of the agent's own work

**Scenario:** Agent Claudine visits Mama Agnes, who has no phone. She confirms that Agnes received her payment, helps her register a mobile money account, and logs the visit. The sector leader sees it right away.

### Panel 5: Beneficiary Access

**Purpose:** Let the people who receive funds use the system. See Section 7 for the three groups.

**Features**

- Check payment status and history
- See program information and next payment date
- See a simple summary of how money was used
- Report a problem or complaint
- See agent job openings (app users)
- Savings tips and reminders

### Panel 6: Financial Usage Map

**Purpose:** Show on a map where poverty and money problems are, using NISR data together with program and payment data. See Section 8 for full details.

---

## 6. How Money Flows

1. A government or NGO program loads its funds into the platform records.
2. The platform checks the beneficiary list for duplicates and errors.
3. The program sends money to each person's bank or mobile money account.
4. The platform records each payment and its status (sent, received, failed).
5. The platform records how money is used afterwards (withdrawals, spending types).
6. Agents visit people who have not been reached or who need help.
7. Leaders and the Statistics Panel see everything in near real time.

**Why accounts matter:** When money goes into a bank or mobile money account, it can be followed. This pushes every beneficiary to open an account, which raises the number of people using financial services.

---

## 7. The Three Groups of Beneficiaries

| Group | Who | How they use the platform |
|---|---|---|
| Group 1 | Has a basic phone, no internet | USSD menu. Check payment, check status, report a problem |
| Group 2 | Has a smartphone and internet | Web app or mobile app. See payments, spending summary, programs, jobs |
| Group 3 | No phone, no internet, low digital skill | A field agent helps and acts for them, with their consent |

**Scenario for Group 1:** Jean dials the USSD code, chooses "My payment" and sees that 25,000 RWF was sent on the 5th.

**Scenario for Group 3:** An agent visits an elderly woman and checks her payment for her, then helps her open an account.

**Movement between groups:** When a Group 3 person gets a phone, or a Group 1 person gets a smartphone, the agent updates the record and they move to the better group.

---

## 8. Financial Usage Map and Problem Spots

### 8.1 What it is

A map of Rwanda that opens down to district, sector and cell. It joins three sources:

1. NISR data from the Statistics Panel (poverty, employment)
2. Program data (enrollments, coverage, agent jobs)
3. Payment and transaction data (money sent, received, spent)

### 8.2 Map layers

| Layer | What it shows | Source |
|---|---|---|
| Poverty level | How poor each area is | NISR data |
| Unemployment | Where people have no work | NISR data |
| Program coverage | Share of poor people inside a program | Programs and NISR |
| Money sent | Funds paid out per area | Payments |
| Money received | Funds that reached the person's account | Bank and mobile money records |
| Bank use | Share of people with an account | Platform data |
| Cash withdrawals | Areas where money is taken out in cash right away | Transactions |
| Spending types | Food, school fees, health, farming, transport, savings, betting | Transactions |
| Agent jobs | Where agents are hired and where none are | Program jobs |

### 8.3 Problem spots

The map colors each area red, yellow or green and marks problem spots automatically.

| Problem spot | Plain meaning | Example rule (adjustable) |
|---|---|---|
| High poverty, low coverage | The area is poor but few people get help | Poverty above 40% and coverage below 30% |
| Paid but not received | Funds were sent but people did not get them | More than 10% of payments not received after 7 days |
| Low bank use | Many beneficiaries have no account | Less than 50% of beneficiaries have an account |
| Heavy cash withdrawals | Money leaves the account almost at once | More than 70% withdrawn within 24 hours of payment |
| Poor spending pattern | Large share goes to harmful spending | Betting above 15% of spending |
| High unemployment, no jobs | People need work but no program is hiring | Unemployment above the national level and zero open agent jobs |

**Note:** The numbers above are starting examples. The final values should be decided after studying the real NISR data.

### 8.4 Color rule

- **Green:** no problem spot in the area
- **Yellow:** one problem spot, or a mild case
- **Red:** two or more problem spots, or a severe case

### 8.5 Actions from a problem spot

Each problem spot has a short explanation and an action button:

- Send to the district officer, sector leader or program owner
- Ask programs to enroll more people in that area
- Suggest posting agent jobs for that area
- Send agents for guidance visits
- Mark as "in progress" and "solved"

The platform keeps a history so users can see if the color improves after action.

### 8.6 Scenarios

**Scenario 1:** A national officer turns on "High poverty, low coverage." Three sectors in Nyamagabe turn red. She clicks one and sees high poverty, only 18% of poor families in a program, and only 22% with bank accounts. She sends the finding to the district officer. A program then posts agent jobs for that sector.

**Scenario 2:** In one sector, many people withdraw all their money on payment day. The map marks it yellow. The district officer sends agents to give savings and spending guidance. Later the officer checks whether the color improves.

### 8.7 Privacy on the map

The map shows totals and percentages, never names. Names appear only inside the 360 view and only to users who are allowed to see them.

---

## 9. Roles and Access Rules

| Role | Sees | Can do |
|---|---|---|
| National admin | Everything | Manage users, programs, settings, data import |
| NISR analyst | Statistics and map (totals only) | View, filter, export reports |
| Program owner | Only their own program, all areas | Manage program, people, jobs, payments |
| District officer | Their district and everything inside | View 360, assign tasks, view problem spots |
| Sector leader | Their sector and cells inside | View 360, assign tasks |
| Cell leader | Their cell only | View and follow people |
| Agent | Only assigned people in one program | Visit, record, help |
| Beneficiary | Only their own record | View and report |
| Applicant | Open jobs and own applications | Apply for jobs |

**Key rules**

1. A user's area decides what data they see. This is enforced in the database, not only in the screens.
2. An agent is tied to one program. No cross-program access.
3. Every view of a person's record is written to an audit log.
4. Only totals are shown on the map and in statistics.

---

## 10. Data Design (Tables)

Below are the main tables with their key fields. Names can be adjusted when building.

### People and access

**users**
id, full_name, phone, email, national_id (encrypted), role, location_id, status, created_at

**roles_permissions**
id, role, permission, scope (national, district, sector, cell, program)

**locations**
id, name, level (district, sector, cell), parent_id

### Programs and people

**programs**
id, name, owner_org, goal, budget, start_date, end_date, status, eligibility_rules

**program_areas**
id, program_id, location_id

**beneficiaries**
id, user_id, household_size, poverty_category, group_type (1, 2 or 3), has_phone, has_internet, has_account, location_id, consent_given, consent_date

**enrollments**
id, program_id, beneficiary_id, start_date, status, payment_amount, payment_frequency

### Money

**accounts**
id, beneficiary_id, type (bank or mobile money), provider, account_ref (encrypted), verified

**payments**
id, program_id, beneficiary_id, amount, scheduled_date, sent_date, status (scheduled, sent, received, failed), received_date

**transactions**
id, account_id, type (deposit, withdrawal, transfer, purchase), amount, category (food, school, health, farming, transport, savings, betting, other), date, location_id

### Agents and jobs

**job_posts**
id, program_id, title, location_id, slots, duties, deadline, status

**job_applications**
id, job_post_id, applicant_id, school_level, experience, status (applied, accepted, rejected), applied_at

**agent_assignments**
id, agent_id, program_id, beneficiary_id, assigned_date, status

**visits**
id, agent_id, beneficiary_id, visit_date, gps_lat, gps_lng, photo_url, payment_confirmed, notes, synced_at

### Feedback and tracking

**complaints**
id, beneficiary_id, program_id, channel (ussd, app, agent), message, status, created_at

**problem_spots**
id, location_id, type, severity, detected_date, status (open, in progress, solved), assigned_to, solved_date

**notifications**
id, user_id, channel (sms, app), message, sent_at, read_at

### Statistics and safety

**nisr_datasets**
id, name, source_file, year, uploaded_by, uploaded_at, status

**nisr_indicators**
id, dataset_id, location_id, indicator (poverty rate, unemployment, income, and so on), value, year

**audit_logs**
id, user_id, action, record_type, record_id, timestamp, ip_or_device

### Main links between tables

- A program has many enrollments, jobs and payments.
- A beneficiary has many enrollments, payments, accounts and visits.
- A job post has many applications. An accepted application creates an agent assignment.
- Every person, program and payment links to a location, which links up to cell, sector and district.

---

## 11. NISR Data Plan

### 11.1 Steps

1. **Collect:** Gather all datasets given by the challenge (for example poverty by district, employment, household survey).
2. **Review:** Check columns, years, area names and missing values.
3. **Clean:** Fix spelling of area names, remove duplicates, handle empty values.
4. **Match:** Link each row to the location table (district, sector, cell).
5. **Save:** Store clean values in the indicators table.
6. **Show:** Use the clean data in the Statistics Panel and the map.
7. **Update:** An admin can upload new files and the system repeats steps 3 to 6.

### 11.2 Data quality checks

- Area names must match the official location list.
- Values must be in a sensible range (for example a percentage between 0 and 100).
- Each dataset keeps its source and year so numbers can be trusted and checked.

### 11.3 Information we need from the challenge

- The exact datasets provided and their file formats
- The lowest area level they cover (district, sector or cell)
- The years covered
- Any rules about how the data may be shown or shared

---

## 12. USSD Design

Example code: `*123#` (the real code depends on the telecom provider).

**Main menu**

```
Welcome to [Platform Name]
1. My payment
2. My programs
3. Report a problem
4. Open a bank or mobile money account
5. Language
0. Exit
```

**Flow for "My payment"**

1. User enters a PIN.
2. System shows the last payment: amount, date and status.
3. Options: see older payments, report that money did not arrive, go back.

**Flow for "Report a problem"**

1. Choose the problem: money not received, wrong amount, agent did not visit, other.
2. Confirm.
3. The complaint is saved and sent to the sector leader and the program. The user receives an SMS with a reference number.

**Rules**

- Short menus, simple words.
- Kinyarwanda is the default language, with English and French available.
- A PIN protects the data.
- For the competition demo, a USSD simulator on the website is enough.

---

## 13. Agent Work and Offline Mode

### 13.1 Agent life cycle

1. A program posts a job.
2. A person applies through the applicant account.
3. The program accepts the applicant.
4. The account becomes an Agent account for that program.
5. The agent receives a list of people to visit.
6. The agent visits, records and helps.
7. Performance is tracked. Weak agents are flagged. Strong agents are rated well.

### 13.2 Visit record

Every visit saves: date, GPS location, a photo, whether payment was received, notes, and any problem found.

### 13.3 Offline mode

- The agent's phone keeps the assigned list and forms stored locally.
- Visits are saved on the phone when there is no internet.
- When internet returns, visits sync to the server.
- Conflicts are resolved by keeping the newest record and saving the old one in the history.

---

## 14. Security, Privacy and Trust

Tracking how poor families use their money is sensitive. The platform must earn trust.

1. **Consent:** Each beneficiary agrees to how their data is used. For Group 3, the agent records consent with the person present.
2. **Purpose:** Spending data is used to help and guide people, not to punish them.
3. **Least access:** Users see only what their role and area allow.
4. **Encryption:** National ID numbers and account references are encrypted.
5. **Audit logs:** Every view and change of a person's record is logged.
6. **Totals only on maps and stats:** No names in public views.
7. **Law:** Follow the Rwanda data protection and privacy law and the rules of the financial regulator.
8. **Backups:** Regular automatic backups and a recovery plan.
9. **Sessions:** Short login sessions for leaders and admins, and optional two-step login.

---

## 15. Fraud Prevention

| Risk | Check |
|---|---|
| Same person enrolled twice | Match on national ID and phone number |
| Ghost beneficiaries (people who do not exist) | Agent visit with photo and GPS |
| Agent logs fake visits | GPS must match the home area, photo required, random spot checks |
| Same person paid by many programs by mistake | Cross-program view shows overlap |
| Payment sent to the wrong account | Account must be verified before the first payment |
| Leader misuses data | Audit logs and alerts for unusual views |

---

## 16. Technology and Architecture

### 16.1 Stack (matches the team's skills)

| Part | Tool |
|---|---|
| Website and apps | Next.js, React, TypeScript, Tailwind CSS |
| Database and login | Supabase (PostgreSQL) with Row Level Security |
| Photos and files | Cloudinary |
| Charts | Recharts or Chart.js |
| Maps | Leaflet or MapLibre with Rwanda boundary data |
| USSD | Africa's Talking or telecom gateway (simulator for the demo) |
| SMS | Africa's Talking or similar |
| Payments | Simulated bank and mobile money service for the demo |
| Data cleaning | Python (pandas) |
| Hosting | Vercel |

### 16.2 How the parts fit together

```
Users (web, app, USSD, agents)
        |
   Next.js application  <---->  Supabase (database, login, access rules)
        |                              |
        |                              +--> Row Level Security (area and role rules)
        |
        +--> Cloudinary (photos)
        +--> USSD and SMS gateway
        +--> Payment service (simulated for demo)
        +--> Map and chart components
        +--> Python scripts for NISR data cleaning
```

### 16.3 Why Row Level Security matters

The database itself blocks a cell leader from reading another cell's data. Even if a screen has a mistake, the database still protects the data.

### 16.4 Performance notes

- Pre-calculate map numbers per area on a schedule instead of on every click.
- Use indexes on location, program and date fields.
- Cache statistics that change rarely.

---

## 17. Main Screens and Features by Panel

### Statistics Panel
Overview page, poverty page, employment page, coverage page, report export page, data import page (admin).

### Program Panel
Program list, program register form, program 360 view, beneficiaries list, enroll form, payments page, jobs list, new job form, applicants page, agents page, performance page.

### Government Panel
Area dashboard, people list, person 360 view, program view, missing payments, agent activity, problem spots, tasks and messages.

### Agent Dashboard
My list, person detail, visit form, account help page, complaints page, sync status, my weekly summary.

### Beneficiary Access
Home (payment status), payment history, my programs, report a problem, jobs, savings tips. USSD menu for the same actions.

### Financial Usage Map
Map with layer picker, area detail card, problem spot list, action buttons, history of changes.

---

## 18. Notifications and Languages

**Notifications**

- SMS when a payment is sent and when it is received
- SMS reminder before a payment date
- SMS after a complaint is filed, with a reference number
- App alert for leaders when a new problem spot opens
- Agent alert when a new person is assigned

**Languages**

- Kinyarwanda, English and French
- Simple words and short sentences for beneficiaries
- Voice or SMS option for people who cannot read well (future)

---

## 19. Build Plan (6 Weeks)

| Week | Work | Result |
|---|---|---|
| 1 | Database design, login and roles, location structure, NISR data cleaning and import | Foundation ready, NISR data inside |
| 2 | Statistics Panel, charts, export | Statistics working |
| 3 | Program Panel (programs and jobs), Government Panel with area access | Programs and leaders working |
| 4 | Agent Dashboard, Beneficiary access, USSD simulator, offline mode | People layer working |
| 5 | Payments (simulated), Financial Usage Map, problem spot rules | Money and map working |
| 6 | Testing, Kinyarwanda translation, demo data, pitch deck, demo video | Ready to present |

**If time is short, build these first:** Statistics Panel, Program Panel, Government Panel, Agent Dashboard, USSD simulator. Show the map and payments with sample data.

**Suggested order for AI coding agents:** Database and access rules first, then one panel at a time, testing each panel before the next.

---

## 20. Testing Plan

| Type | What to test |
|---|---|
| Access tests | A cell leader cannot see another cell. A VUP agent cannot see Girinka data. |
| Money tests | Payment status changes correctly. Failed payments are flagged. |
| Map tests | Problem spot rules give the expected colors on sample data. |
| USSD tests | Each menu path works and ends correctly. |
| Offline tests | Agent saves visits offline and they sync later without loss. |
| Data tests | NISR numbers on screen match the cleaned source data. |
| Usability tests | A non-technical person completes a task without help. |
| Load tests | The system stays fast with many beneficiaries (for example 100,000 sample records). |

---

## 21. Demo Story for the Judges (5 Minutes)

1. Open the Statistics Panel and show where poverty and unemployment are highest.
2. Open the Financial Usage Map and show the red problem spots, including one with high poverty and low coverage.
3. A program posts agent jobs for that area from the Program Panel.
4. A young person applies, is accepted, and becomes an agent.
5. The agent finds a person with no phone, enrolls them and helps them open an account.
6. Money is paid and the person checks it by USSD.
7. The district officer opens the 360 view, sees everything, and a missing payment is flagged.
8. Back to the map: the problem spot improves from red to yellow, and the statistics show jobs created.

**Closing line:** One platform, every program, every person, every franc, and jobs for the youth.

---

## 22. Risks and Answers

| Risk | Answer |
|---|---|
| Privacy concerns | Consent, role-based access, audit logs, totals only in public views |
| People with no ID or phone | Agent-assisted enrollment |
| Poor internet in villages | Offline mode for agents, USSD for beneficiaries |
| Agent fraud | GPS, photos, random checks |
| Real payment systems are hard to connect | Use a simulated payment service for the demo and show the plan for real connection |
| Project is too large for the time | Build the core panels first and show the rest with sample data |
| NISR data does not reach cell level | Show the map at the lowest level available and explain the plan for deeper levels |
| Programs may not want to share data | Show the benefit: one place to prove results and reach more people |

---

## 23. Future Growth

1. Real connection with banks and mobile money (MTN, Airtel).
2. Savings groups and small loans linked to beneficiary accounts.
3. Graduation tracking: measure when a family moves out of poverty.
4. Impact score for each program: money delivered, people reached, cost per person, results.
5. Voice and SMS support for people who cannot read well.
6. Connection to national ID and civil registration systems.
7. Early warning: predict which areas may fall into poverty using past data.
8. Support for other countries in the region.

---

## 24. Glossary

| Term | Plain meaning |
|---|---|
| NISR | National Institute of Statistics of Rwanda |
| VUP | Vision 2020 Umurenge Programme, a program that supports poor households |
| Girinka Munyarwanda | A program that gives a cow to poor families |
| USSD | A phone menu (like *123#) that works on basic phones without internet |
| 360 view | One screen that shows everything about a person or a program |
| Beneficiary | A person who receives support from a program |
| Agent | A field worker who visits and helps beneficiaries |
| Problem spot | An area that the system marks as needing attention |
| Coverage | The share of poor people who are inside at least one program |
| Row Level Security | A database rule that decides which rows each user may read |
| Audit log | A record of who looked at or changed data |
| Financial inclusion | Getting more people to use bank and mobile money services |

---

## 25. Open Questions

1. Which NISR datasets did the challenge provide, and at what area level (district, sector or cell)?
2. What are the challenge rules and judging points (innovation, impact, technical work, presentation)?
3. What is the deadline and what must be delivered (working demo, document, video, pitch)?
4. Which programs will be used as examples in the demo (VUP, Girinka Munyarwanda, others)?
5. Will the demo use real or sample beneficiary data? (Sample data is recommended.)
6. Which payment and USSD services can be used for the demo?
7. What is the final platform name?

---

*End of document.*
