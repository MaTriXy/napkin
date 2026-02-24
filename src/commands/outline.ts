import * as fs from "node:fs";
import * as path from "node:path";
import { findVault } from "../utils/vault.js";
import { resolveFile } from "../utils/files.js";
import { extractHeadings } from "../utils/markdown.js";
import { type OutputOptions, output, error } from "../utils/output.js";
import { EXIT_USER_ERROR, EXIT_NOT_FOUND } from "../utils/exit-codes.js";

export async function outline(opts: OutputOptions & {
  vault?: string;
  file?: string;
  format?: string;
  total?: boolean;
}) {
  const v = findVault(opts.vault);
  if (!opts.file) {
    error("No file specified. Use --file <name>");
    process.exit(EXIT_USER_ERROR);
  }

  const resolved = resolveFile(v.path, opts.file);
  if (!resolved) {
    error(`File not found: ${opts.file}`);
    process.exit(EXIT_NOT_FOUND);
  }

  const content = fs.readFileSync(path.join(v.path, resolved), "utf-8");
  const headings = extractHeadings(content);

  output(opts, {
    json: () => (opts.total ? { total: headings.length } : { headings }),
    human: () => {
      if (opts.total) {
        console.log(headings.length);
        return;
      }

      const fmt = opts.format || "tree";
      if (fmt === "json") {
        console.log(JSON.stringify(headings, null, 2));
      } else if (fmt === "md") {
        for (const h of headings) {
          console.log(`${"#".repeat(h.level)} ${h.text}`);
        }
      } else {
        // tree format
        for (const h of headings) {
          const indent = "  ".repeat(h.level - 1);
          console.log(`${indent}${h.text}`);
        }
      }
    },
  });
}
