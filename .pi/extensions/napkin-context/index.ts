import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Markdown, Text } from "@mariozechner/pi-tui";
import { Napkin } from "../../src/sdk.js";
import { findVaultPath } from "../vault-resolve.js";

function getOverview(vaultPath: string): string | null {
  try {
    const output = execSync(`napkin overview --vault "${vaultPath}"`, {
      encoding: "utf-8",
      timeout: 10000,
    }).trim();
    return output || null;
  } catch {
    // Fallback to reading NAPKIN.md directly
    const napkinPath = path.join(vaultPath, "NAPKIN.md");
    if (!fs.existsSync(napkinPath)) return null;
    return fs.readFileSync(napkinPath, "utf-8").trim();
  }
}

export default function (pi: ExtensionAPI) {
  let hasVault = false;

  pi.registerMessageRenderer(
    "napkin-context",
    (message, { expanded }, theme) => {
      if (!expanded) {
        const label = theme.fg("customMessageLabel", "🧻 napkin vault context");
        const hint = theme.fg("dim", " — Ctrl+O to expand");
        return new Text(label + hint, 1, 0);
      }
      return new Markdown(
        message.content,
        1,
        0,
        {
          heading: (t) => theme.fg("mdHeading", t),
          link: (t) => theme.fg("mdLink", t),
          linkUrl: (t) => theme.fg("mdLinkUrl", t),
          code: (t) => theme.fg("mdCode", t),
          codeBlock: (t) => theme.fg("mdCodeBlock", t),
          codeBlockBorder: (t) => theme.fg("mdCodeBlockBorder", t),
          quote: (t) => theme.fg("mdQuote", t),
          quoteBorder: (t) => theme.fg("mdQuoteBorder", t),
          hr: (t) => theme.fg("mdHr", t),
          listBullet: (t) => theme.fg("mdListBullet", t),
          bold: (t) => theme.bold(t),
          italic: (t) => theme.italic(t),
          strikethrough: (t) => theme.strikethrough(t),
          underline: (t) => theme.underline(t),
        },
        { color: (t) => theme.fg("customMessageText", t) },
      );
    },
  );

  pi.on("session_start", async (_event, ctx) => {
    const vaultPath = findVaultPath(ctx.cwd);
    if (!vaultPath) return;

    const overview = getOverview(vaultPath);
    hasVault = !!overview;

    if (overview) {
      // Check if we already injected context in this session
      const alreadyInjected = ctx.sessionManager
        .getEntries()
        .some(
          (e) =>
            e.type === "message" &&
            e.message.role === "custom" &&
            (e.message as { customType?: string }).customType ===
              "napkin-context",
        );

      if (!alreadyInjected) {
        ctx.sessionManager.appendCustomMessageEntry(
          "napkin-context",
          "## Napkin vault context\n" +
            "You have access to a napkin vault (Obsidian-compatible knowledge base). " +
            "Here is the vault overview. Use the kb_search tool to find specific content, " +
            "and the kb_read tool to read files.\n\n" +
            overview,
          true,
        );
      }
    }

    if (ctx.hasUI) {
      const theme = ctx.ui.theme;
      if (hasVault) {
        ctx.ui.setStatus("napkin", `🧻${theme.fg("dim", " napkin")}`);
      } else {
        ctx.ui.setStatus("napkin", theme.fg("dim", "napkin: no NAPKIN.md"));
      }
    }
  });

  // ── Tools ───────────────────────────────────────────────────────

  function getNapkin(cwd: string): Napkin {
    const vaultPath = findVaultPath(cwd);
    if (!vaultPath) throw new Error("No napkin vault found");
    return new Napkin(path.dirname(vaultPath));
  }

  pi.registerTool({
    name: "kb_search",
    label: "KB Search",
    description: "Search the knowledge base for notes matching a query",
    promptSnippet: "Search the napkin vault for notes by keyword or topic",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const n = getNapkin(ctx.cwd);
      const results = n.search(params.query);

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: "No results found." }],
          details: { results: [] },
        };
      }

      const text = results
        .map((r) => {
          let entry = `**${r.file}**`;
          if (r.snippets && r.snippets.length > 0) {
            entry += "\n" + r.snippets.map((s) => `  ${s}`).join("\n");
          }
          return entry;
        })
        .join("\n\n");

      return {
        content: [{ type: "text", text }],
        details: { results },
      };
    },
  });

  pi.registerTool({
    name: "kb_read",
    label: "KB Read",
    description: "Read a file from the knowledge base",
    promptSnippet: "Read a note from the napkin vault by name or path",
    parameters: Type.Object({
      file: Type.String({ description: "File name or path to read" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const n = getNapkin(ctx.cwd);
      const result = n.read(params.file);

      return {
        content: [{ type: "text", text: result.content }],
        details: { path: result.path },
      };
    },
  });
}
