# Cursor Bootstrap Prompt

Use this prompt in Cursor after placing this archive inside a repo.

```text
You are helping me migrate and rebuild the [ i ] project from this archive.

Goal: turn the existing HTML prototypes and docs into a durable React/Vite clickable investor demo.

Rules:
- Preserve the original files in /archive or /raw_originals.
- Do not delete or overwrite source references.
- Build incrementally, page by page.
- Every clickable element must resolve to a route, modal, state change, disabled explanation, or intentional placeholder.
- No ghost buttons.
- Use low-cost execution first: GPT-5-mini / Composer 2.
- Use stronger models only for architecture, multi-file bugs, or failed attempts.

First task:
1. Inspect the archive structure.
2. Create a clean Vite + React + TypeScript app.
3. Create a route/screen registry for all prototype screens.
4. Convert only the first screen into React.
5. Report all clickable elements on that first screen and where each one resolves.
```
