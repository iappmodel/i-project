# CLAUDE.md — Autonomous Development Rules

## Mission

Build this project through a remote/autonomous AI workflow.

Marcelo should be able to approve, modify, and redirect work from his phone while the Mac stays online and agents execute development tasks.

## Repo Reality

This repo appears to be primarily Flutter/Dart, with TypeScript/React/Supabase sidecar code.

Flutter indicators:
- pubspec.yaml
- lib/
- android/
- ios/
- web/
- macos/
- windows/
- linux/
- test/
- integration_test/

TypeScript sidecar indicators:
- package.json
- src/
- tsconfig.studio.json
- supabase/
- backend/
- services/

Do not assume this is Vite, Next, Expo, or pure React.

## Current Environment Status

Flutter and Dart are not currently available on this Mac:

- flutter --version: command not found
- dart --version: command not found

TypeScript status:

- npm run typecheck fails because tsconfig.json is missing
- npm run studio:typecheck passes using tsconfig.studio.json

## Operating Model

Work must happen through small autonomous blocks.

Each block must have:
- ticket
- branch
- acceptance criteria
- validation command
- done-log update
- PR or clear summary

## Non-Negotiables

1. Work one ticket at a time.
2. Do not delete existing app code.
3. Do not rewrite architecture unless a ticket explicitly asks.
4. Do not add backend/auth/payments unless explicitly asked.
5. Do not assume missing tools are installed.
6. Do not install large dependencies without explaining why.
7. Keep changes reversible.
8. Prefer modifying existing built pieces over rebuilding from scratch.
9. Update /ai/done-log.md after every task.
10. If validation cannot run, document why.

## Agent Workflow

Before coding:
1. Read CLAUDE.md.
2. Read /ai/project-context.md.
3. Read /ai/build-queue.md.
4. Read /ai/done-log.md.
5. Inspect relevant files.
6. Confirm correct validation command.

During coding:
- Make small focused edits.
- Do not touch unrelated files.
- Prefer extending existing screens/components.
- Avoid broad refactors.

After coding:
1. Run available validation.
2. Update /ai/done-log.md.
3. Summarize files changed.
4. Explain validation result.
5. Create/prepare PR if running through GitHub.
