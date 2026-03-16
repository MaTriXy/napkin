# Distill — Automatic KB Distillation

A pi extension that watches your conversations and automatically extracts structured knowledge into your napkin vault.

## How it works

```
Pi session (user + agent chat)
        │
        ▼
    Timer (every N minutes, configurable)
        │
        ▼
    Check conversation — any new entries since last run?
        │               │
        │ no             │ yes
        │ (skip)         ▼
        │           Build prompt
        │               │
        │               ├── reads NAPKIN.md (vault context)
        │               └── reads Templates/*.md (output format)
        │               │
        │               ▼
        │           Call model (claude-sonnet-4-6)
        │               │
        │               ├── nothing to capture → skip
        │               │
        │               ▼
        │           Parse output (extract structured notes)
        │               │
        │               ▼
        │           Write to vault (decisions/, people/, ...)
        │
        └── repeat on next interval
```

## The key insight

Napkin is LLM-free. The distill extension adds intelligence without coupling it to the core tool. The extension:

1. **Lives in pi** — it's a pi extension, not a napkin feature
2. **Uses the existing model ecosystem** — any model pi can talk to, distill can use
3. **Outputs via templates** — the vault's own templates define the output format
4. **Runs in the background** — no user action needed, just a timer

The agent doesn't do the distillation. A separate, cheap model call does. The agent keeps working; distill runs alongside it.

## Configuration

All settings live in `.napkin/config.json` under the `distill` key:

```bash
napkin config set --key distill.enabled --value true
```

Or edit `.napkin/config.json`:

```json
{
  "distill": {
    "enabled": true,
    "intervalMinutes": 60,
    "model": { "provider": "anthropic", "id": "claude-sonnet-4-6" },
    "templates": []
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `distill.enabled` | `false` | Enable automatic distillation |
| `distill.intervalMinutes` | `60` | How often to check for new content |
| `distill.model.provider` | `"anthropic"` | LLM provider |
| `distill.model.id` | `"claude-sonnet-4-6"` | Model for distillation |
| `distill.templates` | `[]` | Which templates to use (empty = all in Templates/) |

## What gets distilled

The extension reads new conversation entries (user and assistant messages) since the last distill run. It sends them to the model along with:

- **NAPKIN.md** — so the model knows what this vault is about
- **Templates** — so the model knows what output format to use

The model is prompted to:
1. Identify knowledge worth capturing — decisions, facts, action items, people info, etc.
2. Match each piece to the best vault template
3. Output structured notes in the template format

If nothing is worth capturing, the model outputs `NO_DISTILL` and no notes are created.

## Output format

The model outputs notes in a parseable format:

```
---BEGIN NOTE---
path: decisions/use-postgres.md
---
---
status: accepted
date: "2026-03-15"
---
# Use PostgreSQL for the main database

## Context
We need a relational database for the core data model...

## Decision
PostgreSQL over MySQL...

## Consequences
...
---END NOTE---
```

Each note is written directly to the vault at the specified path.

## Manual trigger

Use `/distill` in pi to manually trigger distillation of the full conversation (ignores the interval, processes everything).

## Design decisions

**Why a pi extension, not a napkin command?**
Napkin is LLM-free by design. Distillation needs an LLM. The extension bridges the two worlds — it uses pi's model access and napkin's vault structure without either needing to know about the other.

**Why a timer, not a file watcher?**
Conversations don't produce files — they're in-memory session state. A timer periodically checks for new conversation content. File-based distillation (e.g., processing raw dumps in Inbox/) could be added later.

**Why templates as the output format?**
Templates are already in the vault. Users already define them when they `napkin init --template`. Using them for distillation means the output matches what the user expects — no new format to learn, no post-processing needed.

**Why a separate model call, not the agent?**
The agent is busy doing the user's work. Distillation is a background task that shouldn't interrupt or slow down the main conversation. A cheap, fast model (Haiku, mini, or Sonnet) handles it independently.
