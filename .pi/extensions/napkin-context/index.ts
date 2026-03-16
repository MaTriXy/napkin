import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function findVaultPath(cwd: string): string | null {
  let dir = cwd;
  while (dir !== path.dirname(dir)) {
    const napkinDir = path.join(dir, ".napkin");
    if (fs.existsSync(napkinDir)) {
      return napkinDir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function readNapkinMd(vaultPath: string): string | null {
  const napkinPath = path.join(vaultPath, "NAPKIN.md");
  if (!fs.existsSync(napkinPath)) return null;
  return fs.readFileSync(napkinPath, "utf-8").trim();
}

export default function (pi: ExtensionAPI) {
  let cachedContext: string | null = null;

  pi.on("session_start", async (_event, ctx) => {
    const vaultPath = findVaultPath(ctx.cwd);
    if (!vaultPath) return;

    cachedContext = readNapkinMd(vaultPath);

    if (ctx.hasUI) {
      const theme = ctx.ui.theme;
      if (cachedContext) {
        ctx.ui.setStatus("napkin", "🧻" + theme.fg("dim", " napkin"));
      } else {
        ctx.ui.setStatus(
          "napkin",
          theme.fg("dim", "napkin: no NAPKIN.md"),
        );
      }
    }
  });

  pi.on("before_agent_start", async (event, _ctx) => {
    if (!cachedContext) return;

    return {
      systemPrompt:
        event.systemPrompt +
        "\n\n## Napkin vault context\n" +
        "You have access to a napkin vault (Obsidian-compatible knowledge base). " +
        "Here is the vault overview. Use `napkin search <query>` to find specific content, " +
        "`napkin read <file>` to open files.\n\n" +
        cachedContext,
    };
  });
}
