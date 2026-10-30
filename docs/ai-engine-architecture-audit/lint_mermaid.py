"""Structural Mermaid smoke test. NOT the official parser: checks the mistakes that most often break rendering."""
import re, sys, pathlib

D = pathlib.Path("D:/Project/Poverty-Analysis-Reduction/docs/ai-engine-architecture-audit")
problems = []
count = 0


def lint(name, idx, code):
    out = []
    lines = [l for l in code.split("\n")]
    first = next((l.strip() for l in lines if l.strip()), "")
    kind = "flow" if re.match(r"^(flowchart|graph)\s+(TB|TD|LR|RL|BT)$", first) else "seq" if first == "sequenceDiagram" else None
    if not kind:
        out.append(f"bad header: {first!r}")
        return out
    depth = 0
    sub_ids = []
    node_ids = set()
    blocks = 0
    participants = set()
    for n, raw in enumerate(lines, 1):
        l = raw.strip()
        if not l or l == first or l.startswith("%%"):
            continue
        if l.count('"') % 2:
            out.append(f"line {n}: odd number of quotes: {l[:80]}")
        if kind == "flow":
            m = re.match(r'^subgraph\s+([A-Za-z0-9_]+)(\["[^"]*"\])?$', l)
            if l.startswith("subgraph"):
                if not m:
                    out.append(f"line {n}: malformed subgraph: {l[:80]}")
                else:
                    if m.group(1) in sub_ids or m.group(1).lower() == "end":
                        out.append(f"line {n}: duplicate or reserved subgraph id {m.group(1)}")
                    sub_ids.append(m.group(1))
                depth += 1
                continue
            if l == "end":
                depth -= 1
                if depth < 0:
                    out.append(f"line {n}: end without subgraph")
                continue
            # unquoted bracket labels
            for br in re.finditer(r"([A-Za-z0-9_]+)(\[|\{|\()(?!\")", l):
                if not l[br.start():].startswith(br.group(1) + "[\"") and not l[br.start():].startswith(br.group(1) + "{\""):
                    out.append(f"line {n}: unquoted label after {br.group(1)}: {l[:80]}")
            # pipe labels
            for pl in re.finditer(r"\|([^|]*)\|", l):
                body = pl.group(1)
                if re.fullmatch(r'"[^"]*"', body):
                    continue  # a fully quoted edge label is valid Mermaid
                if re.search(r"[\(\)\[\]\{\}\"]", body):
                    out.append(f"line {n}: special character in edge label {pl.group(1)!r}")
            # arrows
            stripped = re.sub(r'"[^"]*"', '""', l)
            stripped = re.sub(r"\|[^|]*\|", "", stripped)
            if re.search(r"--(?!>)|-\.(?!->)|==(?!>)", stripped.replace("-->", "").replace("-.->", "").replace("==>", "")) and ("--" in stripped.replace("-->", "").replace("-.->", "")):
                out.append(f"line {n}: suspicious arrow: {l[:80]}")
            if ";" in stripped:
                out.append(f"line {n}: semicolon outside quotes")
            for nid in re.findall(r'^([A-Za-z0-9_]+)(?=\[|\{)', stripped):
                node_ids.add(nid)
            for t in re.findall(r"([A-Za-z0-9_]+)\s*(?:-->|-\.->)", stripped):
                node_ids.add(t)
        else:
            if re.match(r"^(participant|actor)\s", l):
                m = re.match(r"^(participant|actor)\s+([A-Za-z0-9_]+)(\s+as\s+.+)?$", l)
                if not m:
                    out.append(f"line {n}: malformed participant")
                else:
                    participants.add(m.group(2))
                continue
            if re.match(r"^(alt|loop|opt|par|critical|break|rect)\b", l):
                blocks += 1
                continue
            if re.match(r"^(else|and|option)\b", l):
                if blocks <= 0:
                    out.append(f"line {n}: else outside block")
                continue
            if l == "end":
                blocks -= 1
                if blocks < 0:
                    out.append(f"line {n}: end without block")
                continue
            if l.startswith("autonumber"):
                continue
            if l.startswith("Note "):
                if not re.match(r"^Note (over|left of|right of) [A-Za-z0-9_,\s]+:", l):
                    out.append(f"line {n}: malformed Note")
                if ";" in l or "#" in l:
                    out.append(f"line {n}: ; or # in note")
                continue
            m = re.match(r"^([A-Za-z0-9_]+)\s*(-->>|->>|--x|-x|-->|->|--\)|-\))\s*([A-Za-z0-9_]+)\s*:\s*(.+)$", l)
            if not m:
                out.append(f"line {n}: unparsed sequence line: {l[:80]}")
                continue
            for p in (m.group(1), m.group(3)):
                if p not in participants:
                    out.append(f"line {n}: undeclared participant {p}")
            if ";" in m.group(4) or "#" in m.group(4):
                out.append(f"line {n}: ; or # in message")
    if kind == "flow" and depth != 0:
        out.append("unbalanced subgraph/end")
    if kind == "seq" and blocks != 0:
        out.append("unbalanced alt/loop/end")
    return out


files = sorted(D.glob("*.md"))
for f in files:
    text = f.read_text(encoding="utf8")
    for i, m in enumerate(re.finditer(r"```mermaid\n(.*?)\n```", text, re.S), 1):
        count += 1
        res = lint(f.name, i, m.group(1))
        status = "OK" if not res else "ISSUES"
        print(f"{f.name} block {i}: {status}")
        for p in res:
            print("   ", p)
            problems.append((f.name, i, p))
print(f"{count} diagram blocks checked, {len(problems)} issues")
sys.exit(1 if problems else 0)
