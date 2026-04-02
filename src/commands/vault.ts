import * as fs from "node:fs";
import * as path from "node:path";
import { listFiles, listFolders } from "../utils/files.js";
import { bold, dim, type OutputOptions, output } from "../utils/output.js";
import { findVault } from "../utils/vault.js";

function getVaultSize(vaultPath: string): number {
  let total = 0;
  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name === ".git" ||
        entry.name === ".obsidian" ||
        entry.name === ".napkin"
      )
        continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else total += fs.statSync(full).size;
    }
  }
  walk(vaultPath);
  return total;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function vault(opts: OutputOptions & { vault?: string }) {
  const v = findVault(opts.vault);
  const files = listFiles(v.contentPath);
  const folders = listFolders(v.contentPath);
  const size = getVaultSize(v.contentPath);

  output(opts, {
    json: () => ({
      name: v.name,
      path: v.contentPath,
      files: files.length,
      folders: folders.length,
      size,
    }),
    human: () => {
      console.log(`${dim("name")}       ${bold(v.name)}`);
      console.log(`${dim("path")}       ${v.contentPath}`);
      console.log(`${dim("files")}      ${files.length}`);
      console.log(`${dim("folders")}    ${folders.length}`);
      console.log(`${dim("size")}       ${formatSize(size)}`);
    },
  });
}
