# napkin

Local-first CLI for Obsidian vaults. Operates directly on markdown files — no Obsidian app required.

## Commands

```bash
bun run dev -- <command>     # Dev
bun test                     # Tests
bun run check                # Biome lint + format
```

## Architecture

- `src/main.ts` — Commander entry point, global --json/--quiet/--vault/--copy flags
- `src/commands/` — One file per command group (vault, crud, daily, search, tasks, tags, properties, links, outline, templates, wordcount)
- `src/utils/output.ts` — Chalk output helpers, triple output (json/quiet/human)
- `src/utils/exit-codes.ts` — Standardized exit codes
- `src/utils/vault.ts` — Vault discovery (walks up from cwd looking for .obsidian/)
- `src/utils/files.ts` — File listing, resolution (wikilink-style name or exact path)
- `src/utils/frontmatter.ts` — YAML frontmatter parse/set/remove
- `src/utils/markdown.ts` — Extract headings, tasks, tags, links from markdown

## Key Patterns

- **Output triple**: Every command supports `--json`, `--quiet`, and human-readable output
- **Vault auto-detect**: Walks up from cwd looking for `.obsidian/` directory
- **File resolution**: `--file` resolves by name (like wikilinks), `--path` requires exact path from vault root
- **No Obsidian dependency**: Pure file-system operations on markdown files
- **obsidian:// URI**: `open` and `daily` commands can launch Obsidian via URI protocol

## Adding a New Command

1. Create `src/commands/<name>.ts`
2. Export an async function with `(args, options: OutputOptions)` signature
3. Import and register in `src/main.ts` as a Commander subcommand
4. Use the `output()` helper for triple output
5. Add tests in `src/commands/<name>.test.ts`
