# DUPLICATES_AND_CONFLICTS

**Generated:** 2026-05-21  
**Purpose:** Explicit registry of repeated concepts, competing implementations, and contradictions vs [ i ] Source of Truth

---

## 1. Summary

| Category | Count | Severity |
|----------|-------|----------|
| Competing implementations | 12 domains | High |
| Naming contradictions | 4 | Medium |
| Product vs implementation gaps | 8 | High |
| Duplicate prototypes | 6 | Low |
| Obsolete re-mining risks | 5 | Medium |

---

## 2. Competing Implementations

### 2.1 Native Eye Runtime

| Implementation | Location | Verdict |
|----------------|----------|---------|
| flutter-runtime (T-series) | integrations/eye-tracking/flutter-runtime | **Winner** |
| attention_mediapipe plugin | eye-earn-sparkle-v2 archive | Parallel — not promoted |
| IVAULT monolithic main.dart | checkpoint branches | Obsolete |
| Cursor v1 snapshot | 4980581 | Obsolete |

**Conflict:** Three native stacks with overlapping MediaPipe scope.  
**Resolution (audit):** flutter-runtime canonical; plugin preserved for archaeology only.

---

### 2.2 Web Vision

| Implementation | Location | Verdict |
|----------------|----------|---------|
| vision-unified-pipeline @ 22cabd3 | eye-earn-sparkle-archive | **Winner for promotion** |
| v2 archive/unified-vision | eye-earn-sparkle-v2 | Historical baseline |
| v2 main (adapters only) | eye-earn-sparkle-v2 main | Incomplete |

**Conflict:** Calibration v2 + liveness only on archive branch, not v2 archive.  
**Resolution:** Cherry-pick 22cabd3; do not wholesale merge v2 archive.

---

### 2.3 POPS / Proof

| Implementation | Location | Verdict |
|----------------|----------|---------|
| Backend API pops/ | IVAULT services/api | **Executable authority** |
| i-project POPS docs + Dart types | docs/ + flutter-runtime | **Wire format target** |
| Flutter lib/pops/ hooks | IVAULT checkpoint | Client preview |
| Studio mock proof | studio-proof.ts | Obsolete semantics |

**Conflict:** No Proof Packet v0 in backend; Flutter doesn't emit packets.  
**Resolution:** Map PopsSignalBatch → Proof Packet v0; API authoritative.

---

### 2.4 Wallet UX

| Implementation | Behavior | POPS alignment |
|----------------|----------|----------------|
| app/demoContext | Instant credit on reward | **Conflicts with POPS/pending narrative; only partial tension with constitution wallet pending requirement** |
| demoState.ts (v2) | pending → verification_required → settle | **Aligns** |
| investor-demo branch | Instant credit | **Conflicts** |
| Supabase ledger | Production holds | **Aligns** |
| Flutter wallet_ledger_engine | Simulation | Non-authoritative |

**Conflict:** Loop 1 demo evidence appears to use instant credit while POPS evidence and the constitution's wallet model require pending earnings to be represented.  
**Candidate reconciliation note:** v2 pending patterns are useful evidence, but remain demo-only until backed by authoritative validation.

---

### 2.5 Investor Demo Architecture

| Path | Architecture |
|------|--------------|
| app/ | Linear screen router + proof spine |
| archive v2 | Full app shell + demo overlay |
| investor-demo/ Vite | Linear with presenter controls |
| i-mvp-prototype | Single-file monolith |

**Conflict:** Four demo architectures for same investor story.  
**Resolution:** Dual strategy — complementary, not merged (ADR-004). This is a classification stance, not proof that both surfaces are complete.

---

### 2.6 Studio State

| Store | Location | Lines |
|-------|----------|-------|
| Legacy reducer | IVAULT src/lib/studio/studio-state.ts | Mock Stages 1–7 |
| Platform monolith | IVAULT src/screens/studio/studioStore.ts | ~2596 |
| Promoted source | integrations/source/studioStore.ts | ~466 useSyncExternalStore |
| Archive AI components | eye-earn-sparkle-archive/components/studio | Widget set |

**Conflict:** Three state models + fourth UI lineage.  
**Resolution:** Classify as unresolved product-architecture conflict. Existing audits favor collab/media from source, IVAULT contracts, and archive widgets, but MASTER_BRAIN should not treat that synthesis as implemented.

---

### 2.7 Trust / Freeze

| Layer | Can freeze wallet? |
|-------|-------------------|
| Safe-action rule catalog | Types support freeze_wallet |
| Trust-impact seed rules | All canFreeze* = false |
| POPS backend | Wallet hold/release implemented |
| Flutter trust_engine | Simulation only |

**Conflict:** Freeze capability defined but not activated in seeds or demos.

---

### 2.8 Liveness / Anti-Spoof

| Signal | Authoritative? |
|--------|----------------|
| Web livenessScore | No — UI gate |
| Kotlin likelyFake | No — signal flag |
| VSL bands | Operator confidence only |
| validate-attention | Yes for promo score |

**Conflict:** Multiple "liveness" concepts with different authority levels — easy to conflate.

---

### 2.9 Evidence vs Proof

| System | Layer |
|--------|-------|
| Proof Packet v0 | Device → platform handoff |
| Evidence Vault v2 | Admin legal custody |

**Conflict:** Both use "proof" language — different layers. Studio mock proof adds third misleading usage.

---

### 2.10 Remote Control

| Surface | Location |
|---------|----------|
| Web BlinkRemoteControl | archive |
| Flutter lib/features/remote | IVAULT |
| Intent OS dwell/blink | flutter-runtime |

**Conflict:** Different surfaces — map, don't unify blindly.

---

### 2.11 Calibration Schemas

| Stack | Schema |
|-------|--------|
| Web | VisionCalibrationProfile v2 (TS) |
| Dart | adaptive_calibration_profile |
| Native plugin | Encrypted baseline storage |

**Conflict:** Non-interchangeable without mapping doc.

---

### 2.12 ELO Naming

| Expectation | Reality |
|-------------|---------|
| "ELO recommendation engine" | Mock filter over fixtures |
| "iVatar" in masterbrain | Zero implementation |

**Conflict:** Names imply production systems that don't exist.

---

## 3. Naming Contradictions

| Topic | Constitution | Evidence | Status |
|-------|--------------|----------|--------|
| Cash coin | iCoins | Icoin, iCoin | Unresolved mapping |
| Attention coin | aCoins | Vicoin (dual asset) | Unresolved mapping |
| Utility coin | vCoins | Rarely named in code | Gap |
| Engagement coin | eCoins | Not found in audits | Gap |
| Origin coin | oCoins | Not found in audits | Gap |

---

## 4. Product Constitution vs Implementation Gaps

| Constitution requirement | Gap |
|--------------------------|-----|
| Watch→Verify→Reward loop wired | Proof emission missing; instant credit in app/ |
| Trust affects payout speed | Simulated in demos; backend exists but not wired to Loop 1 |
| Five-currency ecosystem | Not implemented end-to-end |
| Creator 60% economics | Screen in app/; not in archive v2 demo |
| Verified attention not surveillance | Multiple vision paths — qualification intent documented, implementation fragmented |
| Marketplace | Not built — priority #6+ |
| Campaign builder | Mock/HTML only |

---

## 5. Duplicate Prototypes

| Duplicate pair | Notes |
|----------------|-------|
| investor-demo/ ↔ branch investor-demo | Byte-aligned; archive has design-ref extra |
| i-mvp-prototype ↔ branch prototype | Mirrored |
| HTML 04–07 ↔ design-reference HTML | Overlapping static flows |
| IVAULT studio-routing ↔ evidence-vault | Identical @ d23d365 |
| cursor/v1-* × 3 | Byte-identical bookmarks |
| MULTI_REPO body ↔ audit cross-refs | Local file may be truncated stub |

---

## 6. Documents That Contradict Each Other

| Doc A | Doc B | Conflict |
|-------|-------|----------|
| Branch name "dev-environment-setup" | Actual content (compile fix) | Misleading |
| Branch name "studio-routing-audit" | Full platform monolith | Over-promises scope |
| Branch name "evidence-vault-v2" | Bulk POPS platform import | Understates scope in name only |
| Recovery report (early) | EVIDENCE_VAULT audit | Assumed branch = liveness product — corrected |
| MVP instant earn demos | POPS pending-first docs | UX contradiction |
| ELO product naming | Mock implementation | Expectation contradiction |

**Rule:** When product docs conflict, **i_SOURCE_OF_TRUTH wins**. When technical authority conflicts, **ownership contract + backend POPS wins** over client simulation.

---

## 7. Repeat Concepts (Same Idea, Many Files)

| Concept | Occurrences |
|---------|-------------|
| Wallet pending/available split | demoState, WalletScreen, ELO mock, POPS wallet service, HTML prototypes |
| Attention scoring | attentionScoring.ts, POPS scoring, attention_kernel.dart, VSL |
| Studio publish pipeline | legacy studio-publish, platform publishEngine, archive AI editor |
| Investor walkthrough | app/, demos/, v2 branch, DEMO_README, HTML archives |
| Trust tiers | trust_engine sim, trust-rules API, ELO mockData, constitution |
| Proof/evidence language | Proof Packet, Evidence Vault, Studio mock proof, marketing "wallet proof" |

---

## 8. Recommended Canonicalization (Knowledge Only)

Not implementation — classification guidance for future work:

1. **Single wire format:** Proof Packet v0  
2. **Single wallet authority:** Supabase + POPS API  
3. **Single native runtime:** flutter-runtime  
4. **Single web vision promotion:** 22cabd3 cherry-pick set  
5. **Single Loop 1 spine:** `app/`; v2 pending UX remains a candidate pattern, not a grafted system  
6. **Single studio type layer:** integrations/source + IVAULT contracts  
7. **Single coin glossary:** Map Vicoin/Icoin → constitution names  

See `CANONICAL_CANDIDATES.md` for file-level pointers.
