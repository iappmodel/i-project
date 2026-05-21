# Chat Relevance Keywords
**Purpose:** Scoring lexicon for MASTERBRAIN chat export triage (2026-05-21).
**Usage:** Metadata-only matching on titles + limited first-user-message samples. No full-thread summarization.

## Priority mapping

| Label | Meaning |
|-------|----------|
| P0 | Core [ i ] architecture, economy, proof, wallet |
| P1 | Product, design, demo, investor |
| P2 | Related references, tools, research |
| P3 | Likely irrelevant or private — do not extract unless owner requests |

## Weighted keywords

- **[ i ]** (weight 25)
- **i app** (weight 22)
- **Natural Intelligence** (weight 22)
- **attention wallet** (weight 22)
- **attention economy** (weight 18)
- **POPS** (weight 20)
- **proof packet** (weight 20)
- **alphabet currency** (weight 18)
- **iCoin** (weight 16)
- **aCoin** (weight 16)
- **eCoin** (weight 16)
- **oCoin** (weight 16)
- **uCoin** (weight 16)
- **vCoin** (weight 16)
- **iVatar** (weight 16)
- **iVAULT** (weight 14)
- **eye tracking** (weight 16)
- **gaze** (weight 12)
- **blink** (weight 10)
- **remote control** (weight 14)
- **ELO** (weight 14)
- **studio** (weight 10)
- **creator economy** (weight 16)
- **campaign** (weight 8)
- **advertiser** (weight 8)
- **investor** (weight 12)
- **demo** (weight 10)
- **pitch** (weight 10)
- **earn** (weight 8)
- **rewards** (weight 8)
- **wallet** (weight 12)
- **fraud** (weight 10)
- **trust** (weight 8)
- **validation** (weight 8)
- **verification** (weight 8)
- **source of truth** (weight 18)
- **masterplan** (weight 12)
- **IMUP** (weight 12)
- **iapp** (weight 14)
- **INEW** (weight 10)
- **click and earn** (weight 14)
- **media marketplace** (weight 16)
- **engagement tracking** (weight 12)
- **MVP** (weight 8)
- **Lovable** (weight 6)
- **Cursor** (weight 6)

## Fuzzy title seeds

- `attention wallet`
- `i app`
- `eye tracking`
- `investor demo`
- `proof packet`
- `alphabet currency`
- `creator economy`
- `natural intelligence`
- `remote control`
- `media marketplace`
- `pops validation`
- `i platform`

## Private / off-topic title heuristics

- `girlfriend|boyfriend|romantic|relationship|ex-girl|win back`
- `instagram\s+feed\s+roast|roast\s+my`
- `implant|osseointegrat|dental|medical|surgery`
- `car\s+sales|boost\s+car`
- `relocation\s+incentiv|countries\s+offering`
- `recovery\s+partner|alcoholism|addiction\s+relationship`
- `love\s+blooms|poem|song\s+lyric`
- `compound\s+interest|how\s+.*\s+works$`
- `notebooklm|youtube\s+research\s+pipeline`
- `best\s+skills\s+to\s+install`
- `conductor\s+install`
- `bypassing\s+login`
- `clarification\s+needed$`
- `document\s+analysis\s+request$`
- `chatgpt\s+memory\s+export`
