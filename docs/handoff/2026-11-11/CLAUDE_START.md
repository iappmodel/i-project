# Claude — [ i ] Independent Architecture and Implementation Lane

**Copy this file's instructions into Claude Code once the repository branch is checked out.**

Repository: `iappmodel/i-project`
Branch: `handoff/claude-app-2026-11-11`
Handoff: `docs/handoff/2026-11-11/README.md`
POP V10 reference only: `iappmodel/i-pop-lab:gpt-pop-twin-independent` `f7a9d0bd522e0de77bfcd1f2f7fc59f713d33628`. Existing POP Claude `twin-integration` is an independent historical branch; do not touch it.

## Your mission
Operate as the independent senior engineer, critic, and builder for the full [ i ] app. Do not merely produce prose. First establish what exists and what is mocked, then implement the **single highest-value architecture/safety/testability correction** in your own isolated app branch, with demonstrable tests. Do not overlap Cursor's changes blindly; the comparison is intentional.

### Priority order
1. Audit `app/` with code-level evidence and reproducible build steps. Examine `MASTER_BRAIN/CANONICAL/i_SOURCE_OF_TRUTH.md`, `IMMERSIVE_UI_DESIGN_LAW.md`, `MASTER_BRAIN/ECONOMY/i-app-economy-rules.md`, `FEATURE_BIBLE.md`, existing README and Cursor rules.
2. Audit data flow and unsafe coupling across Feed→Offers→POP presence→local evidence/outcome→Wallet demos, camera teardown, consent revocation and ICOM authorization.
3. Resolve contradictions explicitly: old universal trust/attention-score/redeemable mock UX is NOT approved POP V10 proof. Canonical visual UX is immersive glass; old dashboards are presenter/admin only. Do not change the owner-declared vision; put executable safety constraints ahead of stale prototype behavior and document conflicts.
4. Write a narrowly scoped, versioned POP app integration **contract proposal** preserving privacy, replay/idempotency limits, non-redeemability, offline behavior, device evaluation/rollout HOLD and safe user messaging. Do not merge lab code.
5. Implement one critical isolated improvement (contract validation, test harness, consent teardown, risk-tier non-execution or boundary checks) and verify it. No huge speculative refactor.
6. Keep `docs/handoff/2026-11-11/CLAUDE_PROGRESS.md` updated, push atomic commits only to `handoff/claude-app-2026-11-11`, and report a reviewable PR candidate.

### Model and mode
Claude Sonnet for cross-file/architecture work, Agent mode after a short internal plan. Use a cheaper model for mechanical documentation or narrow UI fixes. Use expensive Claude/Opus only if genuinely stuck or on critical architecture after simpler attempts. Avoid unbounded autonomous loops/cost.

### Guardrails
No production economy, deployment, money activation, secrets, biometrics leaving device, direct high-risk gaze actions, fake field performance or changed default flags. Do not modify `main`, Cursor branch, POP GPT branch or POP Claude branch. No source archive rewriting. All source/benchmark claims grounded to SHA/tests.

### Report
Exact code paths / actual test logs / risk assessment / conflicts found / commit SHA / next small task. Distinguish CODE VERIFIED vs REPO DOC vs INFERENCE vs NOT MEASURED.
