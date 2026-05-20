# [ i ] Masterbrain — Strategic Memory Layer

This folder is the **strategic memory layer** for the [ i ] project. It preserves what was decided, debated, and designed across long-running chats — so product work is not trapped in fragmented conversation history.

## What this is

- An **index and ingestion system** for important [ i ] chats (currency, ELO/Ivatar, modules, verified attention, wallet, creator economy, worlds/media, safety, UI/UX, and more).
- A place for **imported summaries**, **decisions**, **open questions**, and **links back to repo artifacts** — as they are imported over time.
- **Markdown only** in this pass: preservation and indexing, not full summarization yet.

## What this is not

- **Not application code** — implementation lives under `integrations/`, future `app/`, and rescued HTML prototypes.
- **Not a replacement** for the rescued ChatGPT archive folders (`00_README` … `08_raw_originals`), which remain read-only reference exports.

## How masterbrain complements the repo

| Layer | Path | Role |
|-------|------|------|
| Rescued archive | `00_README` … `08_raw_originals` | Clickable HTML, strategy docs, raw originals |
| Prototype launcher | `prototype-app/index.html` | Navigate all rescued files + integrations |
| Eye-tracking import | `integrations/eye-tracking/` | Engineering copy from `~/eye_tracking_app` |
| **Masterbrain** | `masterbrain/` | Chat inventory, categories, future ingested memory |

## Start here

1. **[01_chat_inventory/CHAT_LEDGER.md](01_chat_inventory/CHAT_LEDGER.md)** — full table of known chats and import status.
2. **[01_chat_inventory/screenshot-derived-chat-list.md](01_chat_inventory/screenshot-derived-chat-list.md)** — same inventory grouped for screenshot validation.
3. **[01_chat_inventory/ingestion-template.md](01_chat_inventory/ingestion-template.md)** — paste/import template per chat.
4. **Category folders** (`02_product_vision/` … `12_open_questions/`) — README stubs describing what belongs in each bucket.

## Import states (ledger)

| Status | Meaning |
|--------|---------|
| `FOUND_FROM_SCREENSHOT` | Title known from screenshots; **content not yet imported** |
| `IMPORTED_SUMMARY` | Condensed summary filed under a category folder |
| `IMPORTED_FULL_TEXT` | Raw or full chat text stored |
| `NEEDS_REVIEW` | Imported but ambiguous or conflicting — human review required |

## Next actions (human / agent)

1. Validate titles against full ChatGPT (or other) exports.
2. For each chat: copy `ingestion-template.md`, fill **Raw Source** when available, then set ledger status.
3. Link ingested chats to `integrations/eye-tracking/`, `06_feed_earning_loops/`, `07_currency_system/`, etc.
