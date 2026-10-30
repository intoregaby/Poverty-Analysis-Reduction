# 08 - Error Handling and Recovery (Diagram 8)

Only handling that exists in code is drawn. Anything not shown is **not implemented** (for example automatic retry of a whole run, alerting, circuit breakers, dead-letter handling, report-blocking on unverified evidence).

```mermaid
flowchart TB
  START["POST run, worker spawned"] --> DL

  subgraph DSET["Dataset loading"]
    DL["catalog.discover and calculate_eicv7 read Data folder"]
    DLF{"archive count not 1, ids not unique, labels conflict, VUP modules disagree, national not 27.4 or 85.3, unknown district"}
    DLF2["ValueError raised"]
    DISK["disk full or scratch under 2 GB - OSError, nothing saved"]
    ENC["Latin-1 fallback notice recorded as reader_warnings, calculation continues"]
  end

  subgraph STG["Stage wrapper Investigation.stage"]
    SF["stage Failed, error appended, events.jsonl, manifest Failed"]
    SW["stage Warning for soft conditions, run continues"]
    CK["checkpoint JSON per stage"]
  end

  subgraph OPT["Optional analyses"]
    OP["FinScope 2024, 2020, 2016, trends each in try-except"]
    UNV["value status Unavailable with reason"]
  end

  subgraph SRCF["Official source retrieval"]
    RF["HTTPError, URLError, TimeoutError, bad PDF, redirect off-site, non-HTTPS"]
    R304["304 Not Modified revalidates cached hash"]
    CF["cached_evidence from earlier run register"]
    RW["stage 2 Warning, claims become not_externally_verified"]
  end

  subgraph LLMF["LLM requests"]
    L1["provider 1 Groq call"]
    L429{"HTTP 429 with Retry-After at most 30 s and not daily limit"}
    L2["one retry after sleep"]
    LD["daily token limit - raised, not retried"]
    LP["next provider NVIDIA"]
    LJ["bad JSON - one more attempt then lenientJson repair - Node only"]
    LX["all providers failed: Python ai_review Warning, Node HTTP 500 and UI error"]
  end

  subgraph VALF["Validation of AI text"]
    VN["narrative sentence fails ID, length, number or causal check - dropped alone"]
    VR["whole review rejected - next provider"]
    VC["clean throws incomplete report"]
    VD["direction contradiction - sentence replaced and logged"]
    VU["unmatched numbers - footnote only"]
  end

  subgraph RPTF["Report generation"]
    PE["exception in prepare or export - stage 8 Failed"]
    FR["fallbackReport when AI absent"]
    UE["browser export error message"]
  end

  subgraph RECOV["Recovery"]
    HB["lease heartbeat older than 120 s - reported as Failed interrupted"]
    WF["child exit non-zero - watchWorker marks manifest Failed"]
    RES["POST resume - reuse Completed and Warning checkpoints, refuse if data signature changed"]
  end

  DL --> DLF
  DLF -->|yes| DLF2 --> SF
  DL --> DISK --> SF
  DL --> ENC --> SW
  SF --> WF --> RES
  HB --> RES
  RES --> CK
  OP -->|exception| UNV
  RF --> R304
  RF --> CF
  RF --> RW --> SW
  L1 --> L429
  L429 -->|yes| L2 --> LP
  L429 -->|daily| LD --> LP
  L1 -->|other HTTP error or timeout| LP
  LP --> LX
  L1 --> LJ
  VN --> VR
  VR --> LP
  VC --> UE
  PE --> SF
  LX --> FR
```

## Handling by failure class (with locations)

| Failure | Behaviour | Code |
|---|---|---|
| Dataset load / structural validation | `ValueError` -> stage `Failed`; run `Failed`; process exit code 1; manifest preserves checkpoints | `engine.stage:137-144`, `Investigation.run:178-182`, `main:387-389` |
| Stata encoding | `UnicodeWarning` recorded, run continues, note added to stage 4 | `analysis._read:40-46`, `engine.py:257-259` |
| Low disk | `check_scratch_space(2 GB)`, `disk_full_tables`; `OSError` "Nothing was saved" | `catalog.py:47-62`, `engine.py:213-217` |
| Data changed on resume | `ValueError` forces a new investigation | `engine.py:190-191` |
| Statistical failures | Validation errors raise (weights, singleton stratum, missing >2%, definitions not reproducing NISR). Optional analyses degrade to `Unavailable` | `analysis.py:28-30`, `context.py:11-13`, `drivers.py:281-285`, `engine.py:261-284` |
| Uncertainty not reconciled | Warning; text conclusions switched to "Uncertainty validation required" | `engine.py:246-256` |
| Source retrieval | per-source error captured; conditional GET + 304; fallback to earlier-run cached evidence; stage 2 is a Warning | `sources.py:113-210`, `engine.py:224-227` |
| Verification module crash | `{status:"Unavailable"}`; report says no claim was checked | `engine.py:317-322`, `reportVerification.js:37-43` |
| LLM failure | provider fallback; `ai_review` Warning with reason string; Node 500 | `ai.py:196-214`, `llm.mjs:61-77`, `vite-api.mjs:516-518` |
| Rate limit | single short wait retry; daily limit not retried | `ai.py:65-80`, `llm.mjs:44-53` |
| Validation failure (AI) | drop sentence; reject review -> next provider; report incomplete -> error | `ai.py:98-161`, `ai-report.mjs:82-83` |
| Worker death | lease heartbeat stale >120 s -> shown as Failed/interrupted; exit != 0 -> manifest set Failed; resume available | `vite-api.mjs:38-59` |
| Delete protection | busy runs cannot be deleted; deleted runs moved to `investigations/trash` | `vite-api.mjs:149-182` |
| API robustness | uniform `try/catch` -> 500 JSON; request size caps (40 KB JSON, 12 MB upload) | `vite-api.mjs:516-518,75-106` |

## Not handled / worth noting

* **No automatic resume or restart**: a failed run waits for a manual `POST resume`.
* **Source failures do not stop the run** and are not surfaced in the report headline beyond "N of M figures match NISR's published tables".
* **Worker output discarded** (`stdio: 'ignore'`): uncaught Python exceptions outside `Investigation.run` are not logged anywhere besides the generic watcher message.
* **Python PDF/XLSX writes are not atomic**; manifests/checkpoints are (`write_json` temp file + `replace_file`).
* **No timeout on the whole stage 8**; each LLM call can take up to ~90 s x 2 attempts x 2 providers (observed 127 s in the Kamonyi run).
* UNKNOWN: behaviour when two Vite processes share one `investigations/` folder (the in-memory `workers` map is per process; the OS lock protects only the same run id).
