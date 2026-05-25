#!/usr/bin/env python3
"""
Extract [ i ]-related ChatGPT + Claude conversations to Desktop folders.
Read-only on IVAULT exports. Copies conversation markdown + referenced attachments.
"""
from __future__ import annotations

import csv
import json
import re
import shutil
import sys
from pathlib import Path

# Reuse triage scoring from sibling script
sys.path.insert(0, str(Path(__file__).resolve().parent))
import chat_export_triage as triage  # noqa: E402

DESKTOP_OUT = Path.home() / "Desktop" / "[i]_PROJECT_CHAT_EXTRACTION"
MIN_SCORE = 12  # include P2+; exclude obvious P3 low relevance
EXCLUDE_PRIVATE_UNLESS_SCORE = 25


def slug(s: str, n: int = 50) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", (s or "untitled").lower()).strip("_")
    return s[:n] or "untitled"


def openai_asset_refs_from_conv(conv: dict) -> set[str]:
    """Collect .dat filenames referenced by image_asset_pointer parts."""
    refs: set[str] = set()
    mapping = conv.get("mapping") or {}
    for node in mapping.values():
        msg = (node or {}).get("message") or {}
        content = msg.get("content")
        if not isinstance(content, dict):
            continue
        for part in content.get("parts") or []:
            if not isinstance(part, dict):
                continue
            pointer = part.get("asset_pointer") or ""
            if not pointer:
                continue
            # sediment://file_00000000abc...  |  file-service://file-XYZ
            if "://" in pointer:
                _, tail = pointer.split("://", 1)
            else:
                tail = pointer
            tail = tail.strip()
            if tail.startswith("file_"):
                refs.add(f"{tail}.dat")
            elif tail.startswith("file-"):
                refs.add(f"{tail}.dat")
            else:
                refs.add(tail)
    return refs


def openai_full_messages(conv: dict) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    mapping = conv.get("mapping") or {}
    nodes = [n for n in mapping.values() if n and n.get("message")]
    nodes.sort(key=lambda n: (n["message"].get("create_time") or 0))
    for node in nodes:
        msg = node["message"]
        role = (msg.get("author") or {}).get("role", "unknown")
        content = msg.get("content")
        text = ""
        if isinstance(content, dict):
            for part in content.get("parts") or []:
                if isinstance(part, str):
                    text += part + "\n"
                elif isinstance(part, dict):
                    if part.get("content_type") == "image_asset_pointer":
                        pointer = part.get("asset_pointer", "")
                        meta = part.get("metadata") or {}
                        dalle = meta.get("dalle") or {}
                        prompt = dalle.get("prompt") or ""
                        text += f"[image: {pointer}"
                        if prompt:
                            text += f" | prompt: {prompt[:500]}"
                        text += "]\n"
                    else:
                        text += json.dumps(part, ensure_ascii=False)[:2000] + "\n"
        elif isinstance(content, str):
            text = content
        text = text.strip()
        if text:
            out.append((role, text))
    return out


def claude_full_messages(conv: dict) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for m in conv.get("chat_messages") or []:
        sender = (m.get("sender") or m.get("role") or "unknown").lower()
        role = "user" if sender in ("human", "user") else "assistant"
        text = m.get("text") or m.get("content") or ""
        if isinstance(text, list):
            text = "\n".join(str(x) for x in text)
        text = str(text).strip()
        if text:
            out.append((role, text))
    return out


def find_openai_conv(cid: str) -> tuple[dict | None, Path | None]:
    for conv_dir in triage.OPENAI_CONV_DIRS:
        if not conv_dir.exists():
            continue
        for jf in sorted(conv_dir.glob("conversations-*.json")):
            with open(jf, encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, list):
                continue
            for conv in data:
                if (conv.get("id") or conv.get("conversation_id")) == cid:
                    return conv, jf
    return None, None


def find_claude_conv(cid: str) -> tuple[dict | None, Path | None]:
    for cf in sorted(triage.CLAUDE_CONV_FILES):
        if not cf.exists():
            continue
        with open(cf, encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            continue
        for conv in data:
            if (conv.get("uuid") or conv.get("id")) == cid:
                return conv, cf
    return None, None


def collect_attachment_refs(text: str) -> set[str]:
    refs: set[str] = set()
    for m in re.finditer(r"file-[A-Za-z0-9]+\.dat", text):
        refs.add(m.group(0))
    for m in re.finditer(r"file_00000000[a-f0-9]+\.dat", text):
        refs.add(m.group(0))
    return refs


def load_asset_map(conv_dir: Path) -> dict[str, str]:
    p = conv_dir / "conversation_asset_file_names.json"
    if not p.exists():
        return {}
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def write_conversation_md(
    out_path: Path,
    meta: dict,
    messages: list[tuple[str, str]],
    attachments: list[str],
) -> None:
    lines = [
        f"# {meta['title']}",
        "",
        "| Field | Value |",
        "|-------|-------|",
        f"| Source | {meta['source']} |",
        f"| ID | `{meta['conversation_id']}` |",
        f"| Score | {meta['relevance_score']} |",
        f"| Priority | {meta['extraction_priority']} |",
        f"| Subsystem | {meta['likely_subsystem']} |",
        f"| Keywords | {meta.get('matched_keywords', '')} |",
        f"| Created | {meta.get('date_created', '')} |",
        "",
    ]
    if attachments:
        lines.append("## Attachments copied")
        for a in attachments:
            lines.append(f"- `{a}`")
        lines.append("")
    lines.append("---")
    lines.append("")
    for role, text in messages:
        lines.append(f"## {role}")
        lines.append("")
        lines.append(text)
        lines.append("")
    out_path.write_text("\n".join(lines), encoding="utf-8")


def should_extract(row: dict) -> bool:
    if row["extraction_priority"] == "P3":
        priv = "personal" in row.get("privacy_note", "")
        if priv and row["relevance_score"] < EXCLUDE_PRIVATE_UNLESS_SCORE:
            return False
        if row["relevance_score"] < MIN_SCORE:
            return False
    return row["relevance_score"] >= MIN_SCORE or row["extraction_priority"] in ("P0", "P1", "P2")


def main() -> None:
    openai_rows = triage.load_openai_conversations()
    claude_rows = triage.load_claude_conversations()
    all_rows = sorted(openai_rows + claude_rows, key=lambda r: (-r["relevance_score"], r["title"]))

    out_gpt = DESKTOP_OUT / "chatGPT"
    out_claude = DESKTOP_OUT / "claude"
    out_gpt.mkdir(parents=True, exist_ok=True)
    out_claude.mkdir(parents=True, exist_ok=True)

    asset_map: dict[str, str] = {}
    gpt_dir = triage.OPENAI_CONV_DIRS[0]
    if gpt_dir.exists():
        asset_map = load_asset_map(gpt_dir)

    extracted = 0
    skipped = 0
    manifest_rows: list[dict] = []

    for i, row in enumerate(all_rows, start=1):
        if not should_extract(row):
            skipped += 1
            continue
        cid = row["conversation_id"]
        src = row["source"]
        rank_prefix = f"{i:04d}"
        fname = f"{rank_prefix}_{slug(row['title'])}_{cid[:8]}.md"

        if src == "openai":
            conv, jf = find_openai_conv(cid)
            if not conv:
                skipped += 1
                continue
            messages = openai_full_messages(conv)
            out_md = out_gpt / fname
            att_dir = out_gpt / "attachments" / cid[:8]
        else:
            conv, jf = find_claude_conv(cid)
            if not conv:
                skipped += 1
                continue
            messages = claude_full_messages(conv)
            out_md = out_claude / fname
            att_dir = out_claude / "attachments" / cid[:8]

        full_text = "\n".join(t for _, t in messages)
        refs = collect_attachment_refs(full_text)
        if src == "openai" and conv:
            refs |= openai_asset_refs_from_conv(conv)
        copied_atts: list[str] = []

        if src == "openai" and gpt_dir.exists():
            att_dir.mkdir(parents=True, exist_ok=True)
            for ref in sorted(refs):
                src_file = gpt_dir / ref
                if not src_file.exists():
                    alt = list(gpt_dir.glob(f"*{ref}*"))
                    if not alt and ref.endswith(".dat"):
                        alt = list(gpt_dir.glob(f"*{ref[:-4]}*"))
                    src_file = alt[0] if alt else src_file
                if src_file.exists():
                    nice = asset_map.get(ref, asset_map.get(src_file.name, ref))
                    ext = Path(nice).suffix or ".dat"
                    safe_name = Path(nice).name.replace("/", "_").replace("\\", "_")
                    if not safe_name.endswith(ext) and ext != ".dat":
                        safe_name = f"{Path(ref).stem}_{safe_name}"
                    dest = att_dir / safe_name
                    if dest.exists() and dest.stat().st_size == src_file.stat().st_size:
                        copied_atts.append(dest.name)
                        continue
                    if not dest.exists():
                        shutil.copy2(src_file, dest)
                    copied_atts.append(dest.name)

        write_conversation_md(out_md, row, messages, copied_atts)
        manifest_rows.append({
            "rank": i,
            "source": src,
            "conversation_id": cid,
            "title": row["title"],
            "score": row["relevance_score"],
            "priority": row["extraction_priority"],
            "subsystem": row["likely_subsystem"],
            "markdown_file": str(out_md.relative_to(DESKTOP_OUT)),
            "attachments": len(copied_atts),
            "messages": len(messages),
        })
        extracted += 1
        if extracted % 25 == 0:
            print(f"  extracted {extracted}...", flush=True)

    manifest_path = DESKTOP_OUT / "EXTRACTION_MANIFEST.tsv"
    with open(manifest_path, "w", newline="", encoding="utf-8") as f:
        if manifest_rows:
            w = csv.DictWriter(f, fieldnames=list(manifest_rows[0].keys()), delimiter="\t")
            w.writeheader()
            w.writerows(manifest_rows)

    readme = DESKTOP_OUT / "README.md"
    readme.write_text(
        f"""# [ i ] Project Chat Extraction

**Generated:** {__import__('datetime').datetime.now().isoformat(timespec='seconds')}
**Source exports:** `~/Desktop/IVAULT/CHATGPT` + `~/Desktop/IVAULT/CLAUDE`
**Filter:** score ≥ {MIN_SCORE} or P0/P1/P2; private P3 excluded unless score ≥ {EXCLUDE_PRIVATE_UNLESS_SCORE}

## Contents

| Folder | Description |
|--------|-------------|
| `chatGPT/` | OpenAI conversations as markdown |
| `chatGPT/attachments/` | Referenced `.dat` assets per conversation |
| `claude/` | Claude conversations as markdown |
| `EXTRACTION_MANIFEST.tsv` | Index of all extracted threads |

## Stats

- **Extracted:** {extracted}
- **Skipped (low relevance):** {skipped}
- **Total scanned:** {len(all_rows)}

## Canonical knowledge

Structured summaries also live in:
`~/Desktop/IVAULT/i-project-rescue/i_project_migration_archive/MASTER_BRAIN/`

Do not treat raw chats as canonical — reconcile with `CANONICAL/i_SOURCE_OF_TRUTH.md`.
""",
        encoding="utf-8",
    )

    print(f"Done. Extracted {extracted} conversations to {DESKTOP_OUT}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
