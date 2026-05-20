# Project Context

Goal: build a remote/autonomous development workflow so Marcelo can approve, redirect, and review work from his phone while the Mac stays online.

Current repo appears to be a Flutter/Dart app with TypeScript/React/Supabase sidecar code.

Current facts:
- Flutter/Dart are not installed or not on PATH.
- npm run studio:typecheck passes.
- npm run typecheck fails because tsconfig.json is missing.
- npm build does not exist.

Immediate priority:
1. Make repo agent-readable.
2. Push to GitHub.
3. Let Claude/GitHub agents audit the repo safely.
4. Install/fix Flutter environment.
5. Build autonomous blocks one by one through issues/PRs.

Do not jump into large feature work before audit and validation are stable.
