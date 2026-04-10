# pi-napkin-context

[Napkin](https://github.com/Michaelliv/napkin) vault context for [pi](https://github.com/badlogic/pi-mono). Injects your vault overview into every session so the agent knows what's in your knowledge base.

Collapsed by default — one-line summary. Expand with `Ctrl+O` to see the full overview.

## Install

```bash
pi install npm:@miclivs/pi-napkin-context
```

## What it does

On session start, the extension:

1. Walks up from `cwd` looking for a `.napkin/` vault
2. Runs `napkin overview` to get the vault map (falls back to reading `NAPKIN.md` directly)
3. Injects the overview as a custom message in the session context

The agent sees the vault structure, folder keywords, and any context you've written in `NAPKIN.md` — without you pasting anything.

## TUI rendering

The custom message renders **collapsed by default** — a single line showing `🧻 napkin vault context`. Press `Ctrl+O` to expand and see the full markdown overview. This keeps the chat clean when vaults are large (80+ lines).

## Requirements

- [napkin](https://github.com/Michaelliv/napkin) CLI installed and a `.napkin/` vault in or above your working directory
- [pi](https://github.com/badlogic/pi-mono) coding agent
