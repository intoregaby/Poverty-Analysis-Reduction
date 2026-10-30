# Ireme Insight — Complete Architecture & Engineering Kit

**Full-scale target:** Comprehensive scientific, research, official evidence, multi-provider AI and production governance design. **Not an MVP.**

## After downloading ZIP
1. Right-click ZIP -> **Extract All** on Windows.
2. Open `00_START_HERE/FULL_BLUEPRINT_OFFLINE.html` in your browser for the complete readable architecture, or `00_START_HERE/FULL_BLUEPRINT.pdf` for a 56-page print-friendly reference.
3. Open `02_ARCHITECTURE/master_visual.png` for a visual summary, and `02_ARCHITECTURE/mermaid/` for 14 editable Mermaid diagrams.
4. Open `11_CLAUDE_CODE_IMPLEMENTATION/MASTER_PROMPT.md`; paste its contents into Claude Code running at your project root, and point Claude to the unzipped package. Claude should study existing code before implementing changes.
5. See `01_CURRENT_STATE_AUDIT/` for the original 2026-10-29 code audit and 17 weaknesses. See `09_MACHINE_CONTRACTS/` for schemas, policies, SQL, OpenAPI, and `10_VERIFICATION_TESTS/` for 95 planned scenarios.
6. The smoke tests can be run from the extracted folder using `python 10_VERIFICATION_TESTS/verify_bundle_structure.py` and `python -m unittest discover -s 10_VERIFICATION_TESTS -p 'test_*.py' -v` (optional `pip install -r requirements-test.txt` for structure tests).

## Included — verified design package vs not built
The ZIP contains engineering documents, source Mermaid diagrams, sample reference policies/tests, contract schemas and a repo migration plan. It **does not contain the finished Ireme Insight application**, NISR confidential microdata, commercial API credentials, production-ready service implementations, official sign-offs, or proof that 95 acceptance scenarios passed. The 95 tests are intentionally marked **NOT RUN**. This is an honest build specification.

## Download troubleshooting
If ChatGPT’s ZIP link fails, download the standalone HTML, PDF or Markdown linked in the chat. They contain the full core specification; the ZIP additionally includes the editable diagrams, tests, schemas, and previous audit. If none work, copy the implementation prompt directly from the conversation.

## Design standard
Zero knowingly released critical data/verification/AI/security errors. Honest uncertainty, independent science, and human approval are mandatory. A statistical estimate can be uncertain even when the software is working correctly.
