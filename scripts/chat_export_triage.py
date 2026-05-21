#!/usr/bin/env python3
"""
MASTERBRAIN chat export triage — read-only on IVAULT exports.
Scores conversation metadata for [ i ] relevance; does not modify source files.
"""
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Optional

IVAULT_ROOT = Path.home() / "Desktop" / "IVAULT"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "MASTER_BRAIN" / "CHAT_RECOVERY"

OPENAI_CONV_DIRS = [
    IVAULT_ROOT / "CHATGPT" / "gpt chats",
    IVAULT_ROOT / "i-project-rescue" / "knowledge" / "openai-export-raw" / "extracted" / "gpt chats",
]
CLAUDE_CONV_FILES = list(IVAULT_ROOT.glob("CLAUDE/data-*/conversations.json"))

TSV_FIELDS = [
    "source",
    "conversation_id",
    "title",
    "date_created",
    "date_updated",
    "path",
    "relevance_score",
    "matched_keywords",
    "likely_subsystem",
    "extraction_priority",
    "privacy_note",
]

# Weighted keyword groups (broad [ i ] triage)
KEYWORD_WEIGHTS: list[tuple[str, int, str]] = [
    # (pattern, weight, label) — order matters for subsystem tie-break
    (r"\[\s*i\s*\]", 25, "[ i ]"),
    (r"\bi\s*app\b", 22, "i app"),
    (r"natural\s+intelligence", 22, "Natural Intelligence"),
    (r"attention\s+wallet", 22, "attention wallet"),
    (r"attention\s+economy", 18, "attention economy"),
    (r"\bpops\b", 20, "POPS"),
    (r"proof\s+packet", 20, "proof packet"),
    (r"alphabet\s+currency", 18, "alphabet currency"),
    (r"\bicoin\b", 16, "iCoin"),
    (r"\bacoin\b", 16, "aCoin"),
    (r"\becoin\b", 16, "eCoin"),
    (r"\bocoin\b", 16, "oCoin"),
    (r"\bucoin\b", 16, "uCoin"),
    (r"\bvcoin\b", 16, "vCoin"),
    (r"\bivatar\b", 16, "iVatar"),
    (r"\bivault\b", 14, "iVAULT"),
    (r"\beye[- ]?track", 16, "eye tracking"),
    (r"\bgaze\b", 12, "gaze"),
    (r"\bblink\b", 10, "blink"),
    (r"remote\s+control", 14, "remote control"),
    (r"\belo\b", 14, "ELO"),
    (r"\bstudio\b", 10, "studio"),
    (r"creator\s+economy", 16, "creator economy"),
    (r"\bcampaign\b", 8, "campaign"),
    (r"\badvertiser", 8, "advertiser"),
    (r"\binvestor\b", 12, "investor"),
    (r"\bdemo\b", 10, "demo"),
    (r"\bpitch\b", 10, "pitch"),
    (r"\bearn\b", 8, "earn"),
    (r"\brewards?\b", 8, "rewards"),
    (r"\bwallet\b", 12, "wallet"),
    (r"\bfraud\b", 10, "fraud"),
    (r"\btrust\b", 8, "trust"),
    (r"\bvalidat", 8, "validation"),
    (r"\bverif", 8, "verification"),
    (r"source\s+of\s+truth", 18, "source of truth"),
    (r"\bmasterplan\b", 12, "masterplan"),
    (r"\bimup\b", 12, "IMUP"),
    (r"\biapp\b", 14, "iapp"),
    (r"\binew\b", 10, "INEW"),
    (r"click\s+and\s+earn", 14, "click and earn"),
    (r"media\s+marketplace", 16, "media marketplace"),
    (r"engagement\s+track", 12, "engagement tracking"),
    (r"\bmvp\b", 8, "MVP"),
    (r"\blovable\b", 6, "Lovable"),
    (r"\bcursor\b", 6, "Cursor"),
]

FUZZY_TITLE_SEEDS = [
    "attention wallet", "i app", "eye tracking", "investor demo", "proof packet",
    "alphabet currency", "creator economy", "natural intelligence", "remote control",
    "media marketplace", "pops validation", "i platform",
]

PRIVATE_TITLE_PATTERNS = [
    r"girlfriend|boyfriend|romantic|relationship|ex-girl|win back",
    r"instagram\s+feed\s+roast|roast\s+my",
    r"implant|osseointegrat|dental|medical|surgery",
    r"car\s+sales|boost\s+car",
    r"relocation\s+incentiv|countries\s+offering",
    r"recovery\s+partner|alcoholism|addiction\s+relationship",
    r"love\s+blooms|poem|song\s+lyric",
    r"compound\s+interest|how\s+.*\s+works$",
    r"notebooklm|youtube\s+research\s+pipeline",
    r"best\s+skills\s+to\s+install",
    r"conductor\s+install",
    r"bypassing\s+login",
    r"clarification\s+needed$",
    r"document\s+analysis\s+request$",
    r"chatgpt\s+memory\s+export",
]

SUBSYSTEM_RULES: list[tuple[str, str]] = [
    (r"source\s+of\s+truth|canonical|constitution|masterplan", "Source of Truth"),
    (r"wallet|currency|icoin|acoin|ecoin|ocoin|ucoin|vcoin|alphabet|economy|fintech", "Economy"),
    (r"wallet|attention\s+wallet", "Wallet"),
    (r"pops|proof\s+packet|proof\b", "POPS/Proof"),
    (r"verif|validat|fraud|trust", "Trust/Fraud"),
    (r"eye|gaze|blink|track|camera", "Eye Tracking"),
    (r"attention|engagement|gaze", "Attention Verification"),
    (r"creator|studio", "Creator Economy"),
    (r"campaign|advertiser", "Campaigns"),
    (r"investor|demo|pitch", "Investor Demo"),
    (r"ux|ui|design|glassmorphism|mockup|walkthrough", "Design/UX"),
    (r"studio\b", "Studio"),
    (r"elo|ivatar", "ELO/iVatar"),
    (r"remote\s+control", "Remote Control"),
]


def compile_patterns() -> list[tuple[re.Pattern, int, str]]:
    return [(re.compile(p, re.I), w, lbl) for p, w, lbl in KEYWORD_WEIGHTS]


def compile_private() -> list[re.Pattern]:
    return [re.compile(p, re.I) for p in PRIVATE_TITLE_PATTERNS]


KW_PATTERNS = compile_patterns()
PRIVATE_PATTERNS = compile_private()


def fuzzy_title_bonus(title: str) -> tuple[int, list[str]]:
    t = title.lower().strip()
    if not t:
        return 0, []
    hits = []
    bonus = 0
    for seed in FUZZY_TITLE_SEEDS:
        if seed in t:
            hits.append(f"fuzzy:{seed}")
            bonus += 8
            continue
        ratio = SequenceMatcher(None, t, seed).ratio()
        if ratio >= 0.72:
            hits.append(f"fuzzy~:{seed}")
            bonus += 5
    # lone "i" product shorthand in title (e.g. "i App Development")
    if re.search(r"(^|\s)i\s+(app|platform|project)", t):
        hits.append("fuzzy:i-product")
        bonus += 10
    return bonus, hits


def score_text(text: str) -> tuple[int, list[str], dict[str, int]]:
    if not text:
        return 0, [], {}
    score = 0
    matched: list[str] = []
    subs: dict[str, int] = defaultdict(int)
    for pat, weight, label in KW_PATTERNS:
        if pat.search(text):
            score += weight
            matched.append(label)
            for sub_pat, sub_name in SUBSYSTEM_RULES:
                if re.search(sub_pat, text, re.I):
                    subs[sub_name] += weight
    fuzz, fuzz_hits = fuzzy_title_bonus(text[:500])
    score += fuzz
    matched.extend(fuzz_hits)
    return score, matched, subs


def pick_subsystem(subs: dict[str, int], matched: list[str]) -> str:
    if not subs:
        return "Unknown"
    return max(subs.items(), key=lambda x: x[1])[0]


def priority_from_score(score: int, is_private: bool, matched: list[str]) -> str:
    if is_private and score < 25:
        return "P3"
    core = {
        "[ i ]", "Natural Intelligence", "attention wallet", "POPS", "proof packet",
        "attention economy", "source of truth", "alphabet currency", "media marketplace",
    }
    if any(m in core for m in matched) or score >= 45:
        return "P0"
    product = {
        "i app", "iCoin", "wallet", "eye tracking", "investor", "demo", "pitch",
        "iVatar", "ELO", "iapp", "click and earn", "masterplan",
    }
    if any(m in product for m in matched) or score >= 28:
        return "P1"
    if score >= 12:
        return "P2"
    if is_private or score < 8:
        return "P3"
    return "P2"


def privacy_note(title: str, score: int, is_private: bool) -> str:
    if is_private and score < 20:
        return "likely personal/off-topic; exclude from extraction unless owner requests"
    if is_private:
        return "mixed signals; title suggests personal topic — owner review before extract"
    if score < 8:
        return "low relevance; metadata only"
    return "ok for structured extraction"


def is_private_title(title: str) -> bool:
    if not title:
        return False
    return any(p.search(title) for p in PRIVATE_PATTERNS)


def ts_from_epoch(val: Any) -> str:
    if val is None:
        return ""
    try:
        v = float(val)
        if v > 1e12:
            v /= 1000
        return datetime.fromtimestamp(v, tz=timezone.utc).strftime("%Y-%m-%d")
    except (TypeError, ValueError, OSError):
        return str(val)[:10] if val else ""


def openai_sample_user_text(conv: dict, max_chars: int = 800) -> str:
    mapping = conv.get("mapping") or {}
    chunks: list[str] = []
    for node in mapping.values():
        if not node:
            continue
        msg = node.get("message") or {}
        role = (msg.get("author") or {}).get("role", "")
        if role != "user":
            continue
        content = msg.get("content")
        if isinstance(content, dict):
            parts = content.get("parts") or []
            for part in parts:
                if isinstance(part, str) and part.strip():
                    chunks.append(part.strip())
        elif isinstance(content, str):
            chunks.append(content)
        if sum(len(c) for c in chunks) >= max_chars:
            break
    return " ".join(chunks)[:max_chars]


def claude_sample_user_text(conv: dict, max_chars: int = 800) -> str:
    msgs = conv.get("chat_messages") or []
    chunks: list[str] = []
    for m in msgs:
        sender = (m.get("sender") or m.get("role") or "").lower()
        if sender not in ("human", "user"):
            continue
        text = m.get("text") or m.get("content") or ""
        if isinstance(text, list):
            text = " ".join(str(x) for x in text)
        if isinstance(text, dict):
            text = json.dumps(text)[:200]
        if str(text).strip():
            chunks.append(str(text).strip())
        if sum(len(c) for c in chunks) >= max_chars:
            break
    return " ".join(chunks)[:max_chars]


def load_openai_conversations() -> list[dict]:
    seen: set[str] = set()
    rows: list[dict] = []
    primary = OPENAI_CONV_DIRS[0]
    for conv_dir in OPENAI_CONV_DIRS:
        if not conv_dir.exists():
            continue
        is_dup = conv_dir != primary
        for jf in sorted(conv_dir.glob("conversations-*.json")):
            with open(jf, encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, list):
                continue
            for conv in data:
                cid = conv.get("id") or conv.get("conversation_id") or ""
                if cid in seen:
                    continue
                seen.add(cid)
                title = (conv.get("title") or "").strip() or "(untitled)"
                sample = openai_sample_user_text(conv)
                haystack = f"{title}\n{sample}"
                score, matched, subs = score_text(haystack)
                priv = is_private_title(title)
                pri = priority_from_score(score, priv, matched)
                rows.append({
                    "source": "openai",
                    "conversation_id": cid,
                    "title": title,
                    "date_created": ts_from_epoch(conv.get("create_time")),
                    "date_updated": ts_from_epoch(conv.get("update_time")),
                    "path": f"{conv_dir}/conversations-*.json#{cid}",
                    "relevance_score": score,
                    "matched_keywords": ";".join(dict.fromkeys(matched)),
                    "likely_subsystem": pick_subsystem(subs, matched),
                    "extraction_priority": pri,
                    "privacy_note": privacy_note(title, score, priv),
                    "_dup_note": "duplicate export copy" if is_dup else "",
                    "_msg_hint": len(conv.get("mapping") or {}),
                })
    return rows


def load_claude_conversations() -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()
    for cf in sorted(CLAUDE_CONV_FILES):
        if not cf.exists():
            continue
        with open(cf, encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            continue
        for conv in data:
            cid = conv.get("uuid") or ""
            if cid in seen:
                continue
            seen.add(cid)
            title = (conv.get("name") or conv.get("summary") or "").strip() or "(untitled)"
            sample = claude_sample_user_text(conv)
            summary = (conv.get("summary") or "").strip()
            haystack = f"{title}\n{summary}\n{sample}"
            score, matched, subs = score_text(haystack)
            priv = is_private_title(title)
            pri = priority_from_score(score, priv, matched)
            rows.append({
                "source": "claude",
                "conversation_id": cid,
                "title": title,
                "date_created": (conv.get("created_at") or "")[:10],
                "date_updated": (conv.get("updated_at") or "")[:10],
                "path": str(cf) + f"#{cid}",
                "relevance_score": score,
                "matched_keywords": ";".join(dict.fromkeys(matched)),
                "likely_subsystem": pick_subsystem(subs, matched),
                "extraction_priority": pri,
                "privacy_note": privacy_note(title, score, priv),
                "_dup_note": "",
                "_msg_hint": len(conv.get("chat_messages") or []),
            })
    return rows


def count_openai_files_scanned() -> dict[str, int]:
    stats = {"conversation_json_shards": 0, "dat_attachments": 0, "other_json": 0, "html": 0}
    base = OPENAI_CONV_DIRS[0]
    if base.exists():
        stats["conversation_json_shards"] = len(list(base.glob("conversations-*.json")))
        stats["dat_attachments"] = len(list(base.glob("*.dat")))
        stats["other_json"] = len(list(base.glob("*.json"))) - stats["conversation_json_shards"]
        stats["html"] = len(list(base.glob("*.html")))
    return stats


def count_claude_files_scanned() -> dict[str, int]:
    claude_root = IVAULT_ROOT / "CLAUDE"
    return {
        "conversations_json": len(CLAUDE_CONV_FILES),
        "project_json": len(list(claude_root.glob("data-*/projects/*.json"))) if claude_root.exists() else 0,
        "batch_folders": len(list(claude_root.glob("data-*"))) if claude_root.exists() else 0,
    }


def write_tsv(path: Path, rows: list[dict]) -> None:
    ranked = sorted(rows, key=lambda r: (-r["relevance_score"], r["title"]))
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=TSV_FIELDS, delimiter="\t", extrasaction="ignore")
        w.writeheader()
        for r in ranked:
            w.writerow(r)


def write_keywords_md(path: Path) -> None:
    lines = [
        "# Chat Relevance Keywords\n",
        "**Purpose:** Scoring lexicon for MASTERBRAIN chat export triage (2026-05-21).\n",
        "**Usage:** Metadata-only matching on titles + limited first-user-message samples. No full-thread summarization.\n\n",
        "## Priority mapping\n\n",
        "| Label | Meaning |\n|-------|----------|\n",
        "| P0 | Core [ i ] architecture, economy, proof, wallet |\n",
        "| P1 | Product, design, demo, investor |\n",
        "| P2 | Related references, tools, research |\n",
        "| P3 | Likely irrelevant or private — do not extract unless owner requests |\n\n",
        "## Weighted keywords\n\n",
    ]
    for _, weight, label in KEYWORD_WEIGHTS:
        lines.append(f"- **{label}** (weight {weight})\n")
    lines.append("\n## Fuzzy title seeds\n\n")
    for s in FUZZY_TITLE_SEEDS:
        lines.append(f"- `{s}`\n")
    lines.append("\n## Private / off-topic title heuristics\n\n")
    for p in PRIVATE_TITLE_PATTERNS:
        lines.append(f"- `{p}`\n")
    path.write_text("".join(lines), encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    openai_rows = load_openai_conversations()
    claude_rows = load_claude_conversations()
    o_stats = count_openai_files_scanned()
    c_stats = count_claude_files_scanned()

    write_tsv(OUTPUT_DIR / "OPENAI_RELEVANT_CONVERSATIONS.tsv", openai_rows)
    write_tsv(OUTPUT_DIR / "CLAUDE_RELEVANT_CONVERSATIONS.tsv", claude_rows)
    write_keywords_md(OUTPUT_DIR / "CHAT_RELEVANCE_KEYWORDS.md")

    def count_pri(rows: list[dict], pri: str) -> int:
        return sum(1 for r in rows if r["extraction_priority"] == pri)

    all_ranked = sorted(openai_rows + claude_rows, key=lambda r: (-r["relevance_score"], r["source"], r["title"]))
    top30 = all_ranked[:30]

    summary = {
        "openai_conversations": len(openai_rows),
        "claude_conversations": len(claude_rows),
        "openai_files": o_stats,
        "claude_files": c_stats,
        "openai_p0": count_pri(openai_rows, "P0"),
        "openai_p1": count_pri(openai_rows, "P1"),
        "openai_p2": count_pri(openai_rows, "P2"),
        "openai_p3": count_pri(openai_rows, "P3"),
        "claude_p0": count_pri(claude_rows, "P0"),
        "claude_p1": count_pri(claude_rows, "P1"),
        "claude_p2": count_pri(claude_rows, "P2"),
        "claude_p3": count_pri(claude_rows, "P3"),
    }
    (OUTPUT_DIR / "_triage_stats.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    # CHAT_EXPORT_TRIAGE.md
    triage_md = f"""# Chat Export Triage

**Date:** {datetime.now(timezone.utc).strftime("%Y-%m-%d")}  
**Archive root:** `{IVAULT_ROOT}`  
**Method:** Read-only metadata scan; titles + capped user-message samples for keyword scoring.

## Export formats discovered

| Source | Primary path | Format | Conversations |
|--------|--------------|--------|---------------|
| OpenAI | `{OPENAI_CONV_DIRS[0]}` | Official export: `conversations-000.json` … `conversations-005.json`, `chat.html`, `export_manifest.json`; `{o_stats['dat_attachments']}` `.dat` **attachment** blobs (images/WebP/PNG — not threads) | **{len(openai_rows)}** unique |
| OpenAI (duplicate) | `{OPENAI_CONV_DIRS[1]}` | Same 580 IDs as CHATGPT copy | deduped in TSV |
| Claude | `{CLAUDE_CONV_FILES[0] if CLAUDE_CONV_FILES else 'n/a'}` | `conversations.json` array (`uuid`, `name`, `summary`, `chat_messages`) | **{len(claude_rows)}** |

**Census note:** `GLOBAL_INTAKE` reported 1,695 OpenAI + 1,220 Claude *paths* — most are attachment `.dat` files and reference-repo false positives, not conversation threads.

## Scan counts

| Metric | OpenAI | Claude |
|--------|-------:|-------:|
| Conversation records scored | {len(openai_rows)} | {len(claude_rows)} |
| JSON shards / export files | {o_stats['conversation_json_shards']} shards + {o_stats['other_json']} meta JSON | {c_stats['conversations_json']} conversations.json |
| Attachment / non-thread files | {o_stats['dat_attachments']} `.dat` | {c_stats['project_json']} project JSON |
| P0 | {summary['openai_p0']} | {summary['claude_p0']} |
| P1 | {summary['openai_p1']} | {summary['claude_p1']} |
| P2 | {summary['openai_p2']} | {summary['claude_p2']} |
| P3 / private-skipped | {summary['openai_p3']} | {summary['claude_p3']} |

## Outputs

- `OPENAI_RELEVANT_CONVERSATIONS.tsv` — ranked OpenAI threads
- `CLAUDE_RELEVANT_CONVERSATIONS.tsv` — ranked Claude threads
- `CHAT_RECOVERY_PRIORITY_QUEUE.md` — top 30 cross-source extract-next
- `CHAT_RELEVANCE_KEYWORDS.md` — lexicon and weights
- `CHAT_EXTRACTION_PLAN.md` — phased extraction playbook

## Privacy

- No unrelated personal thread bodies summarized in this pass.
- P3 rows flagged in `privacy_note`; extraction deferred unless owner opts in.

## Canonicalization readiness

**Not ready.** Triage complete; **full conversation summarization and cross-linking to `docs/` and repo evidence** remain blocked follow-ons.
"""
    (OUTPUT_DIR / "CHAT_EXPORT_TRIAGE.md").write_text(triage_md, encoding="utf-8")

    # Priority queue
    pq_lines = [
        "# Chat Recovery Priority Queue\n\n",
        f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%d')}  \n",
        "**Scope:** Top 30 conversations to extract next (cross-source, by relevance_score).\n\n",
        "| Rank | Source | Priority | Score | Title | Subsystem | ID |\n",
        "|-----:|--------|----------|------:|-------|-----------|----|\n",
    ]
    for i, r in enumerate(top30, 1):
        pq_lines.append(
            f"| {i} | {r['source']} | {r['extraction_priority']} | {r['relevance_score']} | "
            f"{r['title'][:60].replace('|', '/')} | {r['likely_subsystem']} | `{r['conversation_id'][:12]}…` |\n"
        )
    pq_lines.append("\n## By priority band (combined)\n\n")
    for pri in ("P0", "P1", "P2"):
        band = [r for r in all_ranked if r["extraction_priority"] == pri]
        pq_lines.append(f"### {pri} ({len(band)})\n\n")
        for r in band[:40]:
            pq_lines.append(f"- [{r['source']}] **{r['title']}** — score {r['relevance_score']} — `{r['conversation_id'][:8]}`\n")
        if len(band) > 40:
            pq_lines.append(f"- … and {len(band) - 40} more (see TSV)\n")
        pq_lines.append("\n")
    (OUTPUT_DIR / "CHAT_RECOVERY_PRIORITY_QUEUE.md").write_text("".join(pq_lines), encoding="utf-8")

    plan = """# Chat Extraction Plan

**Status:** Triage complete (2026-05-21). Summarization **not** started.

## Phase 1 — P0 extraction (architecture & economy)

1. Extract structured notes from P0 OpenAI + Claude threads into `MASTER_BRAIN/RESEARCH/CHAT_EXTRACTS/` (one markdown per thread, cite `conversation_id`).
2. Map each extract to canonical domains: `CANONICAL/`, `ECONOMY/`, `TRUST_SYSTEM/`, `ATTENTION_SYSTEM/`.
3. Cross-check against existing `docs/technical/*` — flag conflicts in `DUPLICATES_AND_CONFLICTS.md`.

## Phase 2 — P1 extraction (product & investor)

1. Investor demo, eye-tracking, studio, UX threads → `INVESTOR_DEMO/`, `ATTENTION_SYSTEM/`, `CREATOR_ECONOMY/`.
2. Link to repo paths in `REPOSITORY_MAP.md` (eye-earn-sparkle, i-app-demo, etc.).

## Phase 3 — P2 reference pass

1. Tooling (Cursor, Lovable, Claude skills) — reference only; do not promote to SoT.

## Phase 4 — Owner review

1. P3 / private-flagged threads: owner opt-in list only.
2. Resolve duplicate OpenAI export (`CHATGPT/` vs `knowledge/openai-export-raw/`) — already ID-deduped.

## Do not

- Modify raw exports under `~/Desktop/IVAULT/CHATGPT` or `~/Desktop/IVAULT/CLAUDE`.
- Summarize personal/off-topic threads in P3 without explicit owner request.

## Unblock canonicalization when

- [ ] P0 threads extracted and reconciled with `i_SOURCE_OF_TRUTH.md`
- [ ] Proof/wallet/attention claims traced to code or marked Unknown
- [ ] Duplicate IVAULT vs workspace `MASTER_BRAIN` unified
"""
    (OUTPUT_DIR / "CHAT_EXTRACTION_PLAN.md").write_text(plan, encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
