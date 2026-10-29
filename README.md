# Poverty Analysis & Reduction: NISR Social Support Platform

NISR 2026 Big Data Hackathon, **Track 2: Financial Inclusion and Poverty Reduction**.

Rwanda's poverty fell from 38.2% (2016/17) to 27.4% (2023/24), but districts moved in opposite directions, and access to a financial service does not on its own mean a household escapes poverty. This platform puts NISR survey evidence (EICV3-7, FinScope 2012-2024) in front of analysts, district officers and programme owners so social support can be aimed where it is needed. It supports the NST2 (2024-2029) goals on poverty and social protection.

## What it does

- **Poverty and access dashboard:** district poverty, financial access, trends and flagged districts, with plain-language help on every chart.
- **District investigation:** a local worker processes the survey microdata and produces aggregate findings with bootstrap intervals. Drivers are adjusted associations, not proof of cause.
- **NST2 indicators, programme evidence, map and datasets pages.**
- **Chart AI:** ask a question about any chart (Groq, key kept server-side).
- **USSD simulator** for people without smartphones. English and Kinyarwanda.

## Run it

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Checks: `npm test`, `npm run lint`, `npm run build`.

Chart AI needs `GROQ_API_KEY` in `.env.local` (never committed). The district investigation worker needs the NISR microdata in `Data/` (not included) and Python:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r tools/investigation/requirements.txt
.\.venv\Scripts\python.exe -m tools.investigation.engine run --district Gisagara
```

## Data and method

NISR microdata is not redistributed here. Every source is declared in `tools/investigation/registry.py`. See [data inventory](docs/DATA_INVENTORY.md), [official sources](docs/OFFICIAL_SOURCE_REGISTER.md), [district investigation](docs/DISTRICT_INVESTIGATION.md), [evidence verification](docs/EVIDENCE_VERIFICATION.md), [unexplained gap](docs/UNEXPLAINED_GAP.md) and [testing](docs/INVESTIGATION_TESTING.md).

Limits: about 450-480 respondents per district, so small gaps may be chance; FinScope 2020 and 2024 are not directly comparable; findings are associations.

## Live app

_Add the deployed URL and demo login here before submission._
