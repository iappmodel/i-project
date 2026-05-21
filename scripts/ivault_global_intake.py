#!/usr/bin/env python3
"""
IVAULT Global Intake — metadata census only. Does not modify IVAULT source.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

IVAULT_ROOT = Path(os.environ.get("IVAULT_ROOT", os.path.expanduser("~/Desktop/IVAULT")))
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "MASTER_BRAIN" / "GLOBAL_INTAKE"

SKIP_DIR_NAMES = {
    "node_modules",
    ".git",
    "__pycache__",
    ".next",
    ".turbo",
    "dist",
    "build",
    ".cache",
    "Pods",
    ".gradle",
}
# Still traverse but aggregate when inside these
AGGREGATE_ONLY_DIRS = {"node_modules", ".git/objects"}

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp", ".tiff", ".heic"}
VIDEO_EXTS = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
DOC_EXTS = {".md", ".txt", ".pdf", ".docx", ".doc", ".rtf"}
CHAT_EXTS = {".json", ".html", ".htm", ".md", ".txt", ".csv"}
ARCHIVE_EXTS = {".zip", ".tar", ".gz", ".7z", ".rar"}

HIGH_VALUE_KEYWORDS = [
    "masterplan", "master_plan", "feature bible", "feature_bible", "design system",
    "design_system", "economy", "alphabet", "currency", "wallet", "attention",
    "proof", "pops", "campaign", "creator", "investor", "pitch", "demo", "trust",
    "elo", "ivatar", "iVatar", "remote control", "remote_control", "studio",
    "source of truth", "source-of-truth", "canonical", "constitution",
]

SUBSYSTEM_PATTERNS = [
    (r"eye|itrack|vision|gaze|sparkle", "eye_tracking"),
    (r"wallet|vicoin|icoin|payment|economy|currency|alphabet", "wallet_economy"),
    (r"pops|proof|trust|governance|elo", "pops_trust"),
    (r"creator|studio|campaign", "creator_campaign"),
    (r"investor|pitch|demo", "investor_pitch"),
    (r"lovable|vite|react", "prototype_app"),
    (r"chatgpt|openai|gpt", "openai_export"),
    (r"claude|anthropic", "claude_export"),
    (r"codex", "codex_export"),
    (r"remote.?control", "remote_control"),
    (r"layout|ux|ui|mockup|figma", "design_asset"),
    (r"html|prototype|demo", "prototype"),
    (r"github|repo|git", "repo"),
    (r"master.?brain|masterbrain", "master_brain"),
    (r"igo|concept", "concept"),
]

CLASSIFICATION_RULES = [
    (r"obsolete|archive|old|backup|deprecated", "Obsolete Candidate"),
    (r"duplicate|copy|\(\d+\)|_copy", "Duplicate Candidate"),
    (r"prototype|demo|html|mockup|lovable", "Prototype"),
    (r"experimental|wip|draft|scratch", "Experimental"),
    (r"canonical|source.of.truth|constitution|masterplan", "Canonical Candidate"),
    (r"pitch|investor", "High-Value Recovery"),
    (r"reference|reff|ref_", "Reference Only"),
    (r"\.zip$|\.tar", "Raw Archive"),
]


@dataclass
class FileRecord:
    path: str
    name: str
    ext: str
    size: int
    mtime: str
    likely_source: str
    subsystem: str
    classification: str
    viability: str
    priority: str
    notes: str


@dataclass
class FolderAgg:
    path: str
    file_count: int = 0
    total_size: int = 0
    exts: dict = field(default_factory=lambda: defaultdict(int))
    skipped_deps: bool = False


def classify_path(path_lower: str, name_lower: str, ext: str) -> tuple[str, str, str, str]:
    subsystem = "unknown"
    for pat, sub in SUBSYSTEM_PATTERNS:
        if re.search(pat, path_lower, re.I):
            subsystem = sub
            break

    classification = "Unknown"
    for pat, cls in CLASSIFICATION_RULES:
        if re.search(pat, path_lower, re.I) or re.search(pat, name_lower, re.I):
            classification = cls
            break

    priority = "low"
    if any(kw in path_lower or kw in name_lower for kw in HIGH_VALUE_KEYWORDS):
        priority = "high"
        if classification == "Unknown":
            classification = "High-Value Recovery"
    elif classification in ("Canonical Candidate", "High-Value Recovery", "Prototype"):
        priority = "medium"

    viability = "Usable After Review"
    if classification == "Obsolete Candidate":
        viability = "Preserve Only"
    elif classification == "Duplicate Candidate":
        viability = "Needs Owner Decision"
    elif ext in {".zip", ".tar", ".gz", ".7z"}:
        viability = "Needs Extraction"
    elif classification == "Canonical Candidate":
        viability = "Immediately Usable"
    elif classification == "Reference Only":
        viability = "Preserve Only"
    elif ext in IMAGE_EXTS | VIDEO_EXTS:
        viability = "Usable After Review"

    likely_source = "IVAULT archive"
    if "lovable" in path_lower or ("src/pages" in path_lower and "package.json" in path_lower):
        likely_source = "Lovable export"
    elif "chatgpt" in path_lower or "openai" in path_lower:
        likely_source = "OpenAI export"
    elif "claude" in path_lower:
        likely_source = "Claude export"
    elif "codex" in path_lower:
        likely_source = "Codex export"
    elif ".git" in path_lower or "github" in path_lower:
        likely_source = "Git repository"

    notes = ""
    if any(kw in name_lower for kw in HIGH_VALUE_KEYWORDS):
        notes = "high-value keyword match"

    return likely_source, subsystem, classification, viability, priority, notes


def is_lovable_project(dir_path: Path) -> dict:
    pkg = dir_path / "package.json"
    has_pkg = pkg.is_file()
    has_pages = (dir_path / "src" / "pages").is_dir()
    has_components = (dir_path / "src" / "components").is_dir()
    has_readme = (dir_path / "README.md").is_file()
    prompts = list(dir_path.glob("**/prompt*")) + list(dir_path.glob("**/*task*queue*"))
    framework = "unknown"
    if has_pkg:
        try:
            data = json.loads(pkg.read_text(encoding="utf-8", errors="ignore")[:8000])
            deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
            if "vite" in deps or (dir_path / "vite.config.ts").exists() or (dir_path / "vite.config.js").exists():
                framework = "vite/react"
            elif "next" in deps:
                framework = "next"
            elif "react" in deps:
                framework = "react"
        except Exception:
            pass
    score = sum([has_pkg, has_pages, has_components, has_readme, len(prompts) > 0])
    is_lovable = score >= 3 and (has_pages or has_components)
    return {
        "path": str(dir_path),
        "name": dir_path.name,
        "framework": framework,
        "has_package_json": has_pkg,
        "has_src_pages": has_pages,
        "has_src_components": has_components,
        "has_readme": has_readme,
        "has_prompt_artifacts": len(prompts) > 0,
        "lovable_likely": is_lovable,
        "score": score,
    }


def git_info(repo_path: Path) -> dict:
    info = {"path": str(repo_path), "remote": "", "branch": "", "dirty": ""}
    try:
        r = subprocess.run(
            ["git", "-C", str(repo_path), "remote", "-v"],
            capture_output=True, text=True, timeout=5,
        )
        if r.returncode == 0 and r.stdout.strip():
            info["remote"] = r.stdout.strip().split("\n")[0]
        r = subprocess.run(
            ["git", "-C", str(repo_path), "branch", "--show-current"],
            capture_output=True, text=True, timeout=5,
        )
        if r.returncode == 0:
            info["branch"] = r.stdout.strip()
        r = subprocess.run(
            ["git", "-C", str(repo_path), "status", "--porcelain"],
            capture_output=True, text=True, timeout=10,
        )
        if r.returncode == 0:
            info["dirty"] = "dirty" if r.stdout.strip() else "clean"
    except Exception as e:
        info["dirty"] = f"check_failed:{e}"
    return info


def detect_chat_export(path: Path) -> Optional[str]:
    n = path.name.lower()
    if "conversation" in n and path.suffix == ".json":
        return "openai_json"
    if "chat" in n and path.suffix in {".html", ".json"}:
        return "chat_html_json"
    if "claude" in str(path).lower() and path.suffix == ".json":
        return "claude_json"
    if path.parent.name.lower() in ("chatgpt", "openai", "claude", "exports"):
        return "export_folder"
    return None


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    records: list[FileRecord] = []
    folder_aggs: dict[str, FolderAgg] = defaultdict(lambda: FolderAgg(path=""))
    image_by_folder: dict[str, dict] = defaultdict(lambda: {"count": 0, "size": 0, "exts": defaultdict(int)})
    skipped_dep_files = 0
    total_files_seen = 0
    total_dirs = 0
    git_repos: list[dict] = []
    lovable_projects: list[dict] = []
    prototypes: list[dict] = []
    chat_files: list[dict] = []
    high_value: list[dict] = []
    duplicate_clusters: dict[str, list[str]] = defaultdict(list)
    codex_paths: list[str] = []
    openai_paths: list[str] = []
    claude_paths: list[str] = []

    print(f"Scanning {IVAULT_ROOT} ...")
    for root, dirs, files in os.walk(IVAULT_ROOT, topdown=True, followlinks=False):
        root_path = Path(root)
        total_dirs += 1
        # prune heavy dirs from descent
        dirs[:] = sorted(
            d for d in dirs
            if d not in SKIP_DIR_NAMES or d == ".git"  # we'll aggregate .git/objects via skip below
        )

        rel = root_path.relative_to(IVAULT_ROOT) if root_path != IVAULT_ROOT else Path(".")
        in_skip = any(part in SKIP_DIR_NAMES for part in root_path.parts)

        if (root_path / ".git").is_dir() and str(root_path) not in {g["path"] for g in git_repos}:
            git_repos.append(git_info(root_path))

        # Lovable detection at package roots
        if (root_path / "package.json").is_file():
            lp = is_lovable_project(root_path)
            if lp["lovable_likely"] or lp["score"] >= 2:
                lovable_projects.append(lp)

        if "codex" in str(rel).lower():
            codex_paths.append(str(root_path))

        for fn in files:
            total_files_seen += 1
            fp = root_path / fn
            if in_skip or "node_modules" in fp.parts or ".git/objects" in str(fp):
                skipped_dep_files += 1
                continue

            try:
                st = fp.stat()
            except OSError:
                continue

            ext = fp.suffix.lower()
            mtime = datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
            path_lower = str(fp).lower()
            name_lower = fn.lower()

            likely_source, subsystem, classification, viability, priority, notes = classify_path(
                path_lower, name_lower, ext
            )

            if ext == ".html" or (ext in {".tsx", ".jsx"} and "demo" in path_lower):
                prototypes.append({"path": str(fp), "type": "html" if ext == ".html" else "react", "size": st.st_size})

            chat_t = detect_chat_export(fp)
            if chat_t or any(x in path_lower for x in ("chatgpt", "/openai/", "claude", "conversations")):
                chat_files.append({"path": str(fp), "type": chat_t or "chat_related", "size": st.st_size})

            if any(kw in path_lower or kw in name_lower for kw in HIGH_VALUE_KEYWORDS):
                high_value.append({
                    "path": str(fp),
                    "classification": classification,
                    "viability": viability,
                    "subsystem": subsystem,
                })

            # duplicate heuristic: same basename in different folders
            duplicate_clusters[fn.lower()].append(str(fp))

            rec = FileRecord(
                path=str(fp),
                name=fn,
                ext=ext or "(none)",
                size=st.st_size,
                mtime=mtime,
                likely_source=likely_source,
                subsystem=subsystem,
                classification=classification,
                viability=viability,
                priority=priority,
                notes=notes,
            )
            records.append(rec)

            parent_key = str(fp.parent)
            fa = folder_aggs[parent_key]
            fa.path = parent_key
            fa.file_count += 1
            fa.total_size += st.st_size
            fa.exts[ext or "(none)"] += 1

            if ext in IMAGE_EXTS:
                imgf = image_by_folder[parent_key]
                imgf["count"] += 1
                imgf["size"] += st.st_size
                imgf["exts"][ext] += 1

            if "openai" in path_lower or "chatgpt" in path_lower:
                openai_paths.append(str(fp))
            if "claude" in path_lower:
                claude_paths.append(str(fp))

    indexed_files = len(records)
    indexed_folders = len(folder_aggs)

    # TSV
    tsv_path = OUTPUT_DIR / "IVAULT_SOURCE_CENSUS.tsv"
    with tsv_path.open("w", encoding="utf-8") as f:
        f.write("path\tname\textension\tsize_bytes\tmodified\tlikely_source\tsubsystem\tclassification\tviability\tpriority\tnotes\n")
        for r in records:
            notes_esc = r.notes.replace("\t", " ").replace("\n", " ")
            f.write(
                f"{r.path}\t{r.name}\t{r.ext}\t{r.size}\t{r.mtime}\t{r.likely_source}\t{r.subsystem}\t"
                f"{r.classification}\t{r.viability}\t{r.priority}\t{notes_esc}\n"
            )

    # Dedupe lovable by path
    seen_lovable = set()
    unique_lovable = []
    for lp in lovable_projects:
        if lp["path"] not in seen_lovable:
            seen_lovable.add(lp["path"])
            unique_lovable.append(lp)

    # Stats
    stats = {
        "scan_date": datetime.now().isoformat(),
        "ivault_root": str(IVAULT_ROOT),
        "total_files_on_disk": total_files_seen,
        "skipped_dependency_files": skipped_dep_files,
        "indexed_files": indexed_files,
        "indexed_folders": indexed_folders,
        "total_dirs_walked": total_dirs,
        "git_repos": len(git_repos),
        "lovable_projects": len([x for x in unique_lovable if x["lovable_likely"]]),
        "lovable_candidates": len(unique_lovable),
        "prototypes": len(prototypes),
        "chat_files": len(chat_files),
        "high_value": len(high_value),
    }

    # Write helper markdown files
    write_inventory(stats, folder_aggs, git_repos, unique_lovable, prototypes, chat_files, high_value, duplicate_clusters)
    write_repo_index(git_repos)
    write_lovable_index(unique_lovable)
    write_chat_indexes(chat_files, openai_paths, claude_paths)
    write_visual_index(image_by_folder)
    write_prototypes_index(prototypes)
    write_duplicate_clusters(duplicate_clusters)
    write_high_value(high_value)
    write_codex_index(codex_paths)
    write_priority_queue(high_value, unique_lovable, git_repos)

    print(json.dumps(stats, indent=2))
    return stats


def write_inventory(stats, folder_aggs, git_repos, lovable, prototypes, chat_files, high_value, dup_clusters):
    top_folders = sorted(folder_aggs.values(), key=lambda x: x.total_size, reverse=True)[:40]
    major_dirs = []
    if IVAULT_ROOT.exists():
        for child in sorted(IVAULT_ROOT.iterdir()):
            if child.is_dir():
                major_dirs.append(child.name)

    content = f"""# IVAULT Global Inventory

**Scan date:** {stats['scan_date']}  
**Archive root:** `{stats['ivault_root']}`  
**Primary indexing repo:** `~/Desktop/i-project-rescue/i_project_migration_archive`

## Executive Summary

| Metric | Value |
|--------|------:|
| Files on disk (walk count) | {stats['total_files_on_disk']:,} |
| Dependency/git-object files skipped in row census | {stats['skipped_dependency_files']:,} |
| **Files indexed in census TSV** | **{stats['indexed_files']:,}** |
| **Folders with indexed files** | **{stats['indexed_folders']:,}** |
| Directories walked | {stats['total_dirs_walked']:,} |
| Git repositories (.git roots) | {stats['git_repos']} |
| Lovable-likely projects | {stats['lovable_projects']} |
| Lovable/package candidates | {stats['lovable_candidates']} |
| Prototype signals (HTML/React demo) | {stats['prototypes']:,} |
| Chat-related files | {stats['chat_files']:,} |
| High-value keyword matches | {stats['high_value']:,} |

## Census Method

- Recursive walk of `~/Desktop/IVAULT`
- **No file content read** for binaries; metadata via `stat()` only
- **Skipped from per-file rows:** `node_modules/`, `.git/objects/`, `__pycache__/`, `.next/`, `dist/`, `build/`, `.cache/` (counts tracked as skipped)
- Classifications are **heuristic** — owner review required before canonicalization

## Top-Level IVAULT Directories

{chr(10).join(f'- `{n}`' for n in major_dirs)}

## Major Folder Classification (Heuristic)

| Folder | Likely type | Likely subsystem |
|--------|-------------|------------------|
| APP LAYOUT | app layout / design asset | design_asset |
| AUDITS | audit docs | unknown |
| CHATGPT | OpenAI export | openai_export |
| CLAUDE | Claude export | claude_export |
| CONCEPTS | concept / reference | concept |
| DEMOS:REPOS | prototype + repo | prototype / repo |
| HTMLS | HTML prototype | prototype |
| IGO | concept / game | concept |
| iTrack | eye tracking | eye_tracking |
| LAYOUT | UX/UI layout | design_asset |
| LOGO | visual asset | design_asset |
| MASTER_BRAIN / MASTERBRAIN | knowledge corpus | master_brain |
| PAYMENT SYSTEM | economy | wallet_economy |
| RECENTLY DEVELOPED (MULTI) | multi-project dev | prototype |
| REMOTE CONTROL | remote control feature | remote_control |
| SON OF A PITCH | pitch / investor | investor_pitch |
| SYSTEMS:APPS:REFFERENCES | reference apps | reference |
| i-project-rescue | rescue / migration | repo |
| i_project_migration_archive | primary evidence repo | master_brain |

## Largest Indexed Folders (by aggregate file size)

| Folder | Files | Total size (MB) |
|--------|------:|------------------:|
"""
    for fa in top_folders[:25]:
        mb = fa.total_size / (1024 * 1024)
        content += f"| `{fa.path}` | {fa.file_count} | {mb:.1f} |\n"

    content += """
## Viability Map (Corpus-Level)

| Label | Meaning in this intake |
|-------|-------------------------|
| Immediately Usable | Canonical-keyword docs with clear paths |
| Usable After Review | Most indexed sources |
| Needs Extraction | Archives (.zip), nested exports |
| Needs Owner Decision | Duplicate clusters, competing repos |
| Preserve Only | Obsolete/reference-only signals |
| Ignore | Low-priority assets (not listed in priority queue) |

## Related Indexes

See `GLOBAL_INTAKE/` sibling files: census TSV, repo index, Lovable index, chat indexes, visual index, prototypes, duplicates, priority queue.

## Canonicalization Readiness

**Not ready.** Full IVAULT global intake is required before final canonicalization or owner decisions. This document completes the **census pass**; conversation summarization, visual review, and duplicate resolution are **follow-on phases**.

"""
    (OUTPUT_DIR / "IVAULT_GLOBAL_INVENTORY.md").write_text(content, encoding="utf-8")


def write_repo_index(git_repos):
    lines = ["# IVAULT Repository Index\n", f"**Repos found:** {len(git_repos)}\n", "| Path | Remote | Branch | Dirty | Likely purpose |\n", "|------|--------|--------|-------|------------------|\n"]
    for g in sorted(git_repos, key=lambda x: x["path"]):
        p = g["path"].lower()
        purpose = "unknown"
        if "migration" in p or "rescue" in p:
            purpose = "migration / evidence archive"
        elif "eye" in p or "track" in p or "sparkle" in p:
            purpose = "eye-tracking / vision"
        elif "lovable" in p or "vite" in p:
            purpose = "web prototype"
        elif "wallet" in p or "payment" in p:
            purpose = "wallet / economy"
        lines.append(f"| `{g['path']}` | {g['remote'][:80] if g['remote'] else '—'} | {g['branch'] or '—'} | {g['dirty'] or '—'} | {purpose} |\n")
    (OUTPUT_DIR / "IVAULT_REPO_INDEX.md").write_text("".join(lines), encoding="utf-8")


def write_lovable_index(lovable):
    lines = ["# IVAULT Lovable Project Index\n", f"**Projects scanned:** {len(lovable)}\n\n"]
    likely = [x for x in lovable if x["lovable_likely"]]
    lines.append(f"**Lovable-likely:** {len(likely)}\n\n")
    for lp in sorted(lovable, key=lambda x: (-x["score"], x["path"])):
        sub = "prototype_app"
        if "eye" in lp["path"].lower():
            sub = "eye_tracking"
        elif "wallet" in lp["path"].lower() or "payment" in lp["path"].lower():
            sub = "wallet_economy"
        via = "Usable After Review" if lp["lovable_likely"] else "Needs Extraction"
        lines.append(f"## {lp['name']}\n\n")
        lines.append(f"- **Path:** `{lp['path']}`\n")
        lines.append(f"- **Framework:** {lp['framework']}\n")
        lines.append(f"- **package.json:** {lp['has_package_json']}\n")
        lines.append(f"- **src/pages:** {lp['has_src_pages']}\n")
        lines.append(f"- **src/components:** {lp['has_src_components']}\n")
        lines.append(f"- **README:** {lp['has_readme']}\n")
        lines.append(f"- **Prompt/task artifacts:** {lp['has_prompt_artifacts']}\n")
        lines.append(f"- **Lovable-likely:** {lp['lovable_likely']} (score {lp['score']})\n")
        lines.append(f"- **Subsystem:** {sub}\n")
        lines.append(f"- **Viability:** {via}\n\n")
    (OUTPUT_DIR / "IVAULT_LOVABLE_INDEX.md").write_text("".join(lines), encoding="utf-8")


def write_chat_indexes(chat_files, openai_paths, claude_paths):
    openai_files = [c for c in chat_files if "chatgpt" in c["path"].lower() or "openai" in c["path"].lower()]
    claude_files = [c for c in chat_files if "claude" in c["path"].lower()]
    conv_json = [c for c in chat_files if "conversation" in c["path"].lower() and c["path"].endswith(".json")]

    def section(title, files, out_name):
        lines = [f"# {title}\n\n", f"**Files:** {len(files)}\n\n"]
        # try conversation counts in json
        conv_count = 0
        titles = []
        for c in files[:200]:
            if c["path"].endswith(".json") and c["size"] < 50_000_000:
                try:
                    data = json.loads(Path(c["path"]).read_text(encoding="utf-8", errors="ignore")[:500000])
                    if isinstance(data, list):
                        conv_count += len(data)
                        for item in data[:5]:
                            if isinstance(item, dict) and "title" in item:
                                titles.append(item.get("title", ""))
                    elif isinstance(data, dict) and "conversations" in data:
                        conv_count += len(data["conversations"])
                except Exception:
                    pass
        lines.append(f"**Detectable conversations (sampled JSON):** {conv_count or 'not parsed'}\n\n")
        if titles:
            lines.append("### Sample titles\n\n")
            for t in titles[:20]:
                lines.append(f"- {t}\n")
        lines.append("\n## Priority extraction (heuristic)\n\n")
        priority = [c for c in files if any(k in c["path"].lower() for k in HIGH_VALUE_KEYWORDS)]
        lines.append(f"**[ i ]-relevant keyword matches:** {len(priority)}\n\n")
        for c in sorted(priority, key=lambda x: -x["size"])[:30]:
            lines.append(f"- `{c['path']}` ({c['size']} bytes)\n")
        lines.append("\n## All paths (first 100)\n\n")
        for c in files[:100]:
            lines.append(f"- `{c['path']}`\n")
        (OUTPUT_DIR / out_name).write_text("".join(lines), encoding="utf-8")

    section("IVAULT OpenAI / ChatGPT Export Index", openai_files, "IVAULT_OPENAI_INDEX.md")
    section("IVAULT Claude Export Index", claude_files, "IVAULT_CLAUDE_INDEX.md")
    # combined
    lines = ["# IVAULT Chat Exports Index (Combined)\n\n"]
    lines.append(f"| Source | Files |\n|--------|------:|\n")
    lines.append(f"| OpenAI/ChatGPT | {len(openai_files)} |\n")
    lines.append(f"| Claude | {len(claude_files)} |\n")
    lines.append(f"| Conversation JSON (name match) | {len(conv_json)} |\n")
    lines.append(f"| **Total chat-related** | **{len(chat_files)}** |\n\n")
    lines.append("See `IVAULT_OPENAI_INDEX.md` and `IVAULT_CLAUDE_INDEX.md` for detail.\n")
    lines.append("\n**Note:** Conversation summarization deferred — indexes only.\n")
    (OUTPUT_DIR / "IVAULT_CHAT_EXPORTS_INDEX.md").write_text("".join(lines), encoding="utf-8")


def write_visual_index(image_by_folder):
    lines = ["# IVAULT Visual Assets Index\n\n", "**Method:** Grouped by folder; no visual interpretation.\n\n"]
    sorted_folders = sorted(image_by_folder.items(), key=lambda x: -x[1]["count"])[:80]
    lines.append("| Folder | Image count | Total MB | Extensions | Visual review needed |\n")
    lines.append("|--------|------------:|---------:|------------|----------------------|\n")
    for folder, data in sorted_folders:
        exts = ", ".join(f"{k}:{v}" for k, v in sorted(data["exts"].items()))
        mb = data["size"] / (1024 * 1024)
        review = "Yes" if data["count"] > 20 or mb > 50 else "Optional"
        lines.append(f"| `{folder}` | {data['count']} | {mb:.1f} | {exts} | {review} |\n")
    lines.append(f"\n**Total image folders indexed:** {len(image_by_folder)}\n")
    (OUTPUT_DIR / "IVAULT_VISUAL_ASSETS_INDEX.md").write_text("".join(lines), encoding="utf-8")


def write_prototypes_index(prototypes):
    html = [p for p in prototypes if p["type"] == "html"]
    react = [p for p in prototypes if p["type"] == "react"]
    lines = ["# IVAULT Prototypes Index\n\n", f"**HTML files:** {len(html)}\n", f"**React/demo signals:** {len(react)}\n\n"]
    lines.append("## HTML prototypes (largest 40)\n\n")
    for p in sorted(html, key=lambda x: -x["size"])[:40]:
        lines.append(f"- `{p['path']}` ({p['size']:,} bytes)\n")
    lines.append("\n## React/demo signals (sample 30)\n\n")
    for p in sorted(react, key=lambda x: -x["size"])[:30]:
        lines.append(f"- `{p['path']}`\n")
    (OUTPUT_DIR / "IVAULT_PROTOTYPES_INDEX.md").write_text("".join(lines), encoding="utf-8")


def write_duplicate_clusters(dup_clusters):
    lines = ["# IVAULT Duplicate Clusters\n\n", "Basename collisions across different paths (heuristic).\n\n"]
    clusters = [(k, v) for k, v in dup_clusters.items() if len(v) > 1 and not k.startswith(".")]
    clusters.sort(key=lambda x: -len(x[1]))
    lines.append(f"**Duplicate basename groups:** {len(clusters)}\n\n")
    for name, paths in clusters[:60]:
        if len(paths) < 2:
            continue
        lines.append(f"## `{name}` ({len(paths)} copies)\n\n")
        for p in paths[:15]:
            lines.append(f"- `{p}`\n")
        if len(paths) > 15:
            lines.append(f"- … and {len(paths) - 15} more\n")
        lines.append("\n")
    (OUTPUT_DIR / "IVAULT_DUPLICATE_CLUSTERS.md").write_text("".join(lines), encoding="utf-8")


def write_high_value(high_value):
    lines = ["# IVAULT High-Value Sources\n\n", f"**Matches:** {len(high_value)}\n\n"]
    by_sub = defaultdict(list)
    for h in high_value:
        by_sub[h["subsystem"]].append(h)
    for sub, items in sorted(by_sub.items(), key=lambda x: -len(x[1])):
        lines.append(f"## {sub} ({len(items)})\n\n")
        for h in sorted(items, key=lambda x: x["path"])[:40]:
            lines.append(f"- `{h['path']}` — {h['classification']} / {h['viability']}\n")
        if len(items) > 40:
            lines.append(f"- … {len(items) - 40} more\n")
        lines.append("\n")
    (OUTPUT_DIR / "IVAULT_HIGH_VALUE_SOURCES.md").write_text("".join(lines), encoding="utf-8")


def write_codex_index(codex_paths):
    unique = sorted(set(codex_paths))[:100]
    lines = ["# IVAULT Codex Export Index\n\n", f"**Paths under codex-related trees:** {len(unique)}\n\n"]
    for p in unique:
        lines.append(f"- `{p}`\n")
    (OUTPUT_DIR / "IVAULT_CODEX_INDEX.md").write_text("".join(lines), encoding="utf-8")


def write_priority_queue(high_value, lovable, git_repos):
    queue = []
    for h in sorted(high_value, key=lambda x: (0 if x["classification"] == "Canonical Candidate" else 1, x["path"]))[:50]:
        queue.append((h["path"], "High-value doc", h["classification"], "P1"))
    for lp in [x for x in lovable if x["lovable_likely"]][:15]:
        queue.append((lp["path"], "Lovable project", "Prototype", "P1"))
    for g in git_repos[:10]:
        if "migration" in g["path"] or "rescue" in g["path"]:
            queue.append((g["path"], "Git repo", "Canonical Candidate", "P0"))
    lines = ["# IVAULT Recovery Priority Queue\n\n", "Ordered inspection list — **not** owner decisions.\n\n"]
    lines.append("| Priority | Path | Type | Classification |\n|----------|------|------|----------------|\n")
    seen = set()
    for path, typ, cls, pri in queue[:40]:
        if path in seen:
            continue
        seen.add(path)
        lines.append(f"| {pri} | `{path}` | {typ} | {cls} |\n")
    (OUTPUT_DIR / "IVAULT_RECOVERY_PRIORITY_QUEUE.md").write_text("".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
