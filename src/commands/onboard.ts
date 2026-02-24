import { type OutputOptions, output, success } from "../utils/output.js";

const INSTRUCTIONS = `# obsidian-cli

Local-first CLI for Obsidian vaults. No Obsidian app required.

## Quick Reference

\`\`\`bash
# Vault info
obsidian-cli vault --json

# Files
obsidian-cli files --ext md --json
obsidian-cli read <file> --json
obsidian-cli create --name "Note" --content "Hello"
obsidian-cli append --file "Note" --content "More text"
obsidian-cli search --query "meeting" --json
obsidian-cli search:context --query "TODO" --json

# Daily notes
obsidian-cli daily:read --json
obsidian-cli daily:append --content "- [ ] New task"

# Tasks
obsidian-cli tasks --todo --json
obsidian-cli tasks --daily --json
obsidian-cli task --file "note" --line 3 --toggle

# Metadata
obsidian-cli tags --counts --json
obsidian-cli properties --file "note" --json
obsidian-cli property:set --file "note" --name status --value done
obsidian-cli backlinks --file "note" --json
obsidian-cli outline --file "note" --json

# All commands support --json, --quiet, --vault <path>
\`\`\`
`;

export async function onboard(opts: OutputOptions) {
  output(opts, {
    json: () => ({ instructions: INSTRUCTIONS }),
    human: () => {
      console.log(INSTRUCTIONS);
      success("Copy the above into your CLAUDE.md or AGENTS.md");
    },
  });
}
