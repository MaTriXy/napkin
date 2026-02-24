import * as fs from "node:fs";
import * as path from "node:path";

export interface VaultInfo {
  name: string;
  path: string;
}

/**
 * Walk up from startDir looking for .obsidian/ folder.
 * Returns vault name and absolute path, or throws if not found.
 */
export function findVault(startDir?: string): VaultInfo {
  let dir = path.resolve(startDir || process.cwd());
  const root = path.parse(dir).root;

  while (true) {
    const obsidianDir = path.join(dir, ".obsidian");
    if (fs.existsSync(obsidianDir) && fs.statSync(obsidianDir).isDirectory()) {
      return {
        name: path.basename(dir),
        path: dir,
      };
    }
    const parent = path.dirname(dir);
    if (parent === dir || dir === root) {
      throw new Error(
        "No Obsidian vault found. Run this command inside a vault directory (a folder containing .obsidian/).",
      );
    }
    dir = parent;
  }
}

/**
 * Read a JSON config file from .obsidian/ directory.
 * Returns parsed JSON or null if file doesn't exist.
 */
export function getVaultConfig(
  vaultPath: string,
  configFile: string,
): Record<string, unknown> | null {
  const configPath = path.join(vaultPath, ".obsidian", configFile);
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
