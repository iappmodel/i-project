#!/usr/bin/env python3
"""Extract next P0 chat batch summaries from IVAULT exports (read-only)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "MASTER_BRAIN" / "CHAT_RECOVERY" / "EXTRACTED" / "conversations"
IVAULT = Path.home() / "Desktop" / "IVAULT"
OPENAI_DIRS = [
    IVAULT / "CHATGPT" / "gpt chats",
    IVAULT / "i-project-rescue" / "knowledge" / "openai-export-raw" / "extracted" / "gpt chats",
]


def slug(s: str, n: int = 40) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", (s or "untitled").lower()).strip("_")
    return s[:n] or "untitled"


def load_openai_conversations() -> dict[str, dict]:
    out: dict[str, dict] = {}
    for d in OPENAI_DIRS:
        if not d.is_dir():
            continue
        for f in d.glob("conversations-*.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except Exception:
                continue
            for conv in data if isinstance(data, list) else []:
                cid = conv.get("id") or conv.get("conversation_id")
                if cid:
                    out[cid] = conv
    return out


def first_user_excerpt(conv: dict, limit: int = 600) -> str:
    mapping = conv.get("mapping") or {}
    texts: list[str] = []
    for node in mapping.values():
        msg = (node or {}).get("message") or {}
        if msg.get("author", {}).get("role") != "user":
            continue
        content = msg.get("content") or {}
        for part in content.get("parts") or []:
            if isinstance(part, str) and part.strip():
                texts.append(part.strip())
    blob = "\n".join(texts)
    return blob[:limit] + ("..." if len(blob) > limit else "")


def existing_nums() -> set[int]:
    nums: set[int] = set()
    for f in OUT.glob("*.md"):
        m = re.match(r"^(\d+)_", f.name)
        if m:
            nums.add(int(m.group(1)))
    return nums


def parse_tsv(path: Path) -> list[dict]:
    rows: list[dict] = []
    if not path.exists():
        return rows
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines:
        return rows
    headers = lines[0].split("\t")
    for line in lines[1:]:
        parts = line.split("\t")
        if len(parts) >= len(headers):
            rows.append(dict(zip(headers, parts)))
    return rows


def main() -> None:
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 71
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 80
    batch = (start - 1) // 10 + 1

    combined: list[dict] = []
    for row in parse_tsv(ROOT / "MASTER_BRAIN/CHAT_RECOVERY/CLAUDE_RELEVANT_CONVERSATIONS.tsv"):
        row["_source"] = "claude"
        combined.append(row)
    for row in parse_tsv(ROOT / "MASTER_BRAIN/CHAT_RECOVERY/OPENAI_RELEVANT_CONVERSATIONS.tsv"):
        row["_source"] = "openai"
        combined.append(row)

    combined.sort(key=lambda r: -int(r.get("relevance_score") or 0))
    p0 = [r for r in combined if r.get("extraction_priority") == "P0"]

    have = existing_nums()
    openai = load_openai_conversations()
    created: list[str] = []

    rank = 0
    for row in p0:
        rank += 1
        if rank < start or rank > end:
            continue
        num = rank
        if num in have:
            continue
        cid = row.get("conversation_id", "")
        title = row.get("title", "Untitled")
        source = row.get("_source", row.get("source", "?"))
        fname = f"{num:03d}_{slug(title)}.md"
        path = OUT / fname

        excerpt = ""
        if source == "openai" and cid in openai:
            excerpt = first_user_excerpt(openai[cid])

        body = f"""# P0-{num:03d}: {title} ({source})

**Batch:** {batch:02d} | **Extracted:** 2026-05-26 (automated pass)

| Field | Value |
|-------|-------|
| ID | `{cid}` |
| Score | {row.get('relevance_score', '?')} |
| Subsystem | {row.get('likely_subsystem', '?')} |

## Summary

P0 thread — cross-check `DECISIONS/CURRENCY_NAMING_ADR.md` and `WIRING_STATUS.md` for economy/wiring claims.

## Excerpt

```
{excerpt or '(see IVAULT export — excerpt unavailable in this pass)'}
```
"""
        path.write_text(body, encoding="utf-8")
        created.append(fname)

    summary_path = ROOT / f"MASTER_BRAIN/CHAT_RECOVERY/EXTRACTED/P0_BATCH_{batch:02d}_SUMMARY.md"
    lines = [
        f"# P0 Chat Extraction — Batch {batch:02d} Summary\n",
        f"**Extracted:** 2026-05-26  ",
        f"**Scope:** P0 ranks {start}–{end}\n",
        "| # | File | Title | Source |",
        "|---|------|-------|--------|",
    ]
    for f in sorted(created):
        num = int(f[:3])
        title = f[4:].replace(".md", "").replace("_", " ")
        lines.append(f"| {num} | `{f}` | {title} | auto |")
    lines.append(f"\n**P0 progress:** {end} / 104 extracted.\n")
    summary_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Created {len(created)} conversations + {summary_path.name}")


if __name__ == "__main__":
    main()
