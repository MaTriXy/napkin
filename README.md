# napkin

🧻 Obsidian-compatible CLI for agents.

## Install

```bash
npm install -g napkin
```

Or build from source:

```bash
git clone https://github.com/Michaelliv/napkin.git
cd napkin
bun install
bun run build:bun
```

## Usage

Run commands from inside an Obsidian vault (any directory containing `.obsidian/`):

```bash
cd ~/my-vault
napkin vault
```

Or specify the vault path:

```bash
napkin --vault ~/my-vault vault
```

### Global Flags

| Flag | Description |
|---|---|
| `--json` | Output as JSON |
| `-q, --quiet` | Suppress output |
| `--vault <path>` | Vault path (default: auto-detect from cwd) |
| `--copy` | Copy output to clipboard |

## Commands

### Vault

```bash
napkin vault                          # Show vault info (name, path, files, folders, size)
```

### Files & Folders

```bash
napkin file <name>                    # Show file info
napkin files                          # List all files
napkin files --ext md                 # Filter by extension
napkin files --folder Projects        # Filter by folder
napkin files --total                  # Count files
napkin folders                        # List folders
```

### File CRUD

```bash
napkin read <file>                    # Read file contents
napkin create --name "Note" --content "Hello"
napkin create --path "Projects/new" --template "Meeting Note"
napkin append --file "Note" --content "More text"
napkin prepend --file "Note" --content "Top line"
napkin move --file "Note" --to Archive
napkin rename --file "Note" --name "Renamed"
napkin delete --file "Note"           # Move to .trash
napkin delete --file "Note" --permanent
```

### Daily Notes

Reads config from `.obsidian/daily-notes.json` (folder, format, template).

```bash
napkin daily                          # Create + open today's daily note
napkin daily:path                     # Print daily note path
napkin daily:read                     # Print daily note contents
napkin daily:append --content "- [ ] Buy groceries"
napkin daily:prepend --content "## Morning"
```

### Search

```bash
napkin search --query "meeting"       # Find files matching text
napkin search --query "TODO" --path Projects
napkin search --query "bug" --total   # Count matches
napkin search:context --query "TODO"  # Grep-style file:line:text output
```

### Tasks

```bash
napkin tasks                          # List all tasks
napkin tasks --todo                   # Incomplete only
napkin tasks --done                   # Completed only
napkin tasks --daily                  # Today's daily note tasks
napkin tasks --file "Project A"       # Tasks in specific file
napkin tasks --verbose                # Group by file with line numbers
napkin task --file "note" --line 3    # Show task info
napkin task --file "note" --line 3 --toggle   # Toggle ✓/○
napkin task --file "note" --line 3 --done     # Mark done
napkin task --ref "note.md:3" --todo          # Mark todo
```

### Tags

```bash
napkin tags                           # List all tags
napkin tags --counts                  # With occurrence counts
napkin tags --sort count              # Sort by frequency
napkin tag --name "project"           # Tag info
napkin tag --name "project" --verbose # With file list
```

### Properties (Frontmatter)

```bash
napkin properties                     # List all properties in vault
napkin properties --file "note"       # Properties for a file
napkin properties --counts            # With occurrence counts
napkin property:read --file "note" --name title
napkin property:set --file "note" --name status --value done
napkin property:remove --file "note" --name status
```

### Links

```bash
napkin backlinks --file "note"        # Files linking to this file
napkin links --file "note"            # Outgoing links from file
napkin unresolved                     # Broken links in vault
napkin orphans                        # Files with no incoming links
napkin deadends                       # Files with no outgoing links
```

### Outline

```bash
napkin outline --file "note"          # Headings (tree format)
napkin outline --file "note" --format md
napkin outline --file "note" --format json
```

### Templates

```bash
napkin templates                      # List templates
napkin template:read --name "Daily Note"
napkin template:read --name "Meeting" --resolve --title "Standup"
```

### Word Count

```bash
napkin wordcount --file "note"        # Words + characters
napkin wordcount --file "note" --words
```

### Agent Onboarding

```bash
napkin onboard                        # Print agent instructions
```

## File Resolution

Files can be referenced two ways:
- **By name** (wikilink-style): `--file "Active Projects"` — searches all `.md` files by basename
- **By path**: `--file "Projects/Active Projects.md"` — exact path from vault root

## For AI Agents

Every command supports `--json` for structured output. Run `napkin onboard` to get copy-paste instructions for your agent config.

## Development

```bash
bun install
bun run dev -- vault --json      # Run in dev mode
bun test                         # Run tests
bun run check                    # Lint + format
```

## License

MIT
