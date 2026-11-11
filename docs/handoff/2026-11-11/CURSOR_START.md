# Cursor — [ i ] Full Application Development Lane

**Copy this file's instructions into Cursor Agent once the repository branch is checked out.**

Repository: `iappmodel/i-project`
Branch: `handoff/cursor-app-2026-11-11`
Handoff source: `docs/handoff/2026-11-11/README.md`.
Separate POP V10 reference: `iappmodel/i-pop-lab:gpt-pop-twin-independent` at `f7a9d0bd522e0de77bfcd1f2f7fc59f713d33628`. DO NOT cherry-pick or merge its whole branch.

## Execution directive
You are the hands-on Cursor implementation agent for the ENTIRE [ i ] application, but you must operate in **small sequential safe increments**. Work autonomously within your branch, not on main. Read the shared README, canonical product and design docs, current app code and project Cursor rules first. Never assume an old masterplan's status is accurate when code contradicts it.

**Model**: Composer 2 / GPT-5-mini (cost-effective) for initial audit, UI, tests and simple changes. **Mode**: Agent. Escalate to GPT-6 High or Claude Sonnet only for genuinely complex multi-package reasoning, state migration, security boundaries or repeated failed attempts. Report escalation reason.

### First mission
1. Inspect repository, Git status/branch, `app/package.json`, `app/src`, tests and existing routes; verify current build (`cd app && npm ci && npm run typecheck && npm run build`).
2. Audit the existing app with screenshots and an explicit functional matrix: consumer immersive shell, Feed/Promo/Create/Wallet/Profile, sponsored offer, local camera and gaze inputs, POP consent/teardown, reward reveal, wallet pending, convert/withdraw preview, creator/studio/campaign, connect platforms, accessible touch/keyboard controls. Classify each as CODE VERIFIED, MOCK ONLY, BROKEN, or NOT IMPLEMENTED.
3. Fix **one** highest-impact broken/incomplete end-to-end user path that can be repaired without touching money, server or POP lab. Preserve Picture 2 immersive glass product shell and existing screen flow. Add focused tests and ensure interactive controls have real actions, accessible feedback or explicitly disabled explanations.
4. Repeat the typecheck/build/test commands that actually exist. Record exact outputs/limitations in `docs/handoff/2026-11-11/CURSOR_PROGRESS.md`.
5. Commit and push only to your branch, then present exact SHA and candidate PR. Continue iteratively: single purpose per commit, no branch merge or deploy.

### Strong prohibitions
No real coins, settlements, conversion, payments, Supabase production migrations, auth/identity claims or biometric uploads. Never turn M4 flags on by default or bypass POP M5 HOLD. Do not edit Claude's app lane or POP lab. Do not turn an illustrative screen into a purportedly live backend.

### Final response format
Branch / HEAD / actual files changed / commands and pass-fail / real vs simulated/limitations / privacy/economy risk / next change / any model escalation. Do not claim success without running checks.
