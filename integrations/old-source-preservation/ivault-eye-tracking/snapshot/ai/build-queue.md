# Build Queue

## TICKET 001 — Repo audit and validation map
Status: todo
Model: Claude Sonnet
Mode: Agent

Goal:
Audit the repo and create /ai/repo-audit.md.

Acceptance:
- Identify app framework
- Identify TypeScript sidecar code
- Identify validation commands
- Document missing local Flutter/Dart environment
- Explain what can and cannot be validated right now
- Update /ai/done-log.md
- Do not modify app code

Validation:
- npm run
- npm run studio:typecheck
- flutter --version, if available
- dart --version, if available

Do-not-touch:
- Do not modify lib/
- Do not modify src/
- Do not change package.json
- Do not install new libraries


## TICKET 002 — Current screen and feature inventory
Status: todo
Model: Claude Sonnet
Mode: Agent

Goal:
Create /ai/screen-inventory.md.

Acceptance:
- Inventory lib/ screens
- Inventory src/ screens
- Identify iTIP screens
- Identify Ivatar screens
- Identify disconnected or incomplete flows
- Recommend next build blocks
- No app code modified


## TICKET 003 — Autonomous phone workflow docs
Status: todo
Model: Claude Sonnet
Mode: Agent

Goal:
Create /ai/autonomous-workflow.md.

Acceptance:
- Explain GitHub issue labels
- Explain phone approval flow
- Explain PR review flow
- Explain when agents can proceed without Marcelo
- No app code modified
