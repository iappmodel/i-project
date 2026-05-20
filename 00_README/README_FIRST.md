# [ i ] Project Migration Archive

This archive is designed to move the [ i ] project out of ChatGPT and into a stable external platform such as Cursor, GitHub, Google Drive, Notion, Linear, or a local repository.

## What this archive contains

- Strategy and build masterplan
- Clickable HTML prototypes
- Wallet/payment screens
- Feed/earning loop screens
- Creator/campaign tools
- User and creator pitch pages
- Alphabet currency system
- Raw originals folder with all available source files

## Recommended destination structure

Use this as the root of a GitHub/Cursor project:

```text
i-project/
  docs/
    strategy/
    product/
    economy/
    architecture/
  prototypes/
    html/
    clickable/
  app/
    frontend/
    backend/
  assets/
    images/
    brand/
  investor/
    pitch/
    demo-script/
  archive/
    chatgpt-exports/
```

## Immediate next move

Do not keep developing inside scattered chats. Move this archive into a real repo, then turn the HTML prototypes into a React/Vite clickable demo one screen at a time.

Recommended first execution target:

- Platform: Cursor + GitHub
- Model: GPT-5-mini / Composer 2 first
- Mode: Agent for file setup, Plan mode for architecture decisions
- First milestone: create a working local app that reproduces the current clickable prototype structure

## Project recovery diagnosis

The project is not gone, but it is fragmented. The safest way forward is to externalize it into durable files, then maintain a single source of truth outside chat history.
