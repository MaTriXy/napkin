import * as fs from "node:fs";
import * as path from "node:path";
import { findVault, getVaultConfig } from "../utils/vault.js";
import { listFiles, resolveFile } from "../utils/files.js";
import { type OutputOptions, output, error, success } from "../utils/output.js";
import { EXIT_USER_ERROR, EXIT_NOT_FOUND } from "../utils/exit-codes.js";

function getTemplateFolder(vaultPath: string): string {
  const config = getVaultConfig(vaultPath, "templates.json") as { folder?: string } | null;
  return config?.folder || "Templates";
}

export async function templates(opts: OutputOptions & { vault?: string; total?: boolean }) {
  const v = findVault(opts.vault);
  const folder = getTemplateFolder(v.path);
  const files = listFiles(v.path, { folder, ext: "md" }).map((f) =>
    path.basename(f, ".md"),
  );

  output(opts, {
    json: () => (opts.total ? { total: files.length } : { templates: files }),
    human: () => {
      if (opts.total) console.log(files.length);
      else for (const f of files) console.log(f);
    },
  });
}

export async function templateRead(opts: OutputOptions & {
  vault?: string;
  name?: string;
  resolve?: boolean;
  title?: string;
}) {
  const v = findVault(opts.vault);
  if (!opts.name) {
    error("No template name specified. Use --name <template>");
    process.exit(EXIT_USER_ERROR);
  }

  const folder = getTemplateFolder(v.path);
  const resolved = resolveFile(v.path, `${folder}/${opts.name}`) || resolveFile(v.path, opts.name);
  if (!resolved) {
    error(`Template not found: ${opts.name}`);
    process.exit(EXIT_NOT_FOUND);
  }

  let content = fs.readFileSync(path.join(v.path, resolved), "utf-8");

  if (opts.resolve) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    content = content
      .replace(/\{\{date\}\}/g, dateStr)
      .replace(/\{\{time\}\}/g, timeStr)
      .replace(/\{\{title\}\}/g, opts.title || "Untitled");
  }

  output(opts, {
    json: () => ({ template: opts.name, content }),
    human: () => console.log(content),
  });
}

export async function templateInsert(opts: OutputOptions & {
  vault?: string;
  name?: string;
  file?: string;
}) {
  const v = findVault(opts.vault);
  if (!opts.name) {
    error("No template name specified. Use --name <template>");
    process.exit(EXIT_USER_ERROR);
  }
  if (!opts.file) {
    error("No target file specified. Use --file <name>");
    process.exit(EXIT_USER_ERROR);
  }

  const folder = getTemplateFolder(v.path);
  const templateResolved = resolveFile(v.path, `${folder}/${opts.name}`) || resolveFile(v.path, opts.name);
  if (!templateResolved) {
    error(`Template not found: ${opts.name}`);
    process.exit(EXIT_NOT_FOUND);
  }

  const targetResolved = resolveFile(v.path, opts.file);
  if (!targetResolved) {
    error(`File not found: ${opts.file}`);
    process.exit(EXIT_NOT_FOUND);
  }

  let templateContent = fs.readFileSync(path.join(v.path, templateResolved), "utf-8");

  // Resolve variables
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const title = path.basename(targetResolved, ".md");
  templateContent = templateContent
    .replace(/\{\{date\}\}/g, dateStr)
    .replace(/\{\{time\}\}/g, timeStr)
    .replace(/\{\{title\}\}/g, title);

  const targetPath = path.join(v.path, targetResolved);
  const existing = fs.readFileSync(targetPath, "utf-8");
  fs.writeFileSync(targetPath, existing + templateContent);

  output(opts, {
    json: () => ({ file: targetResolved, template: opts.name, inserted: true }),
    human: () => success(`Inserted template "${opts.name}" into ${targetResolved}`),
  });
}
