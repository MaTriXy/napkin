import * as fs from "node:fs";
import * as path from "node:path";

export interface VaultInfo {
  /** Vault display name (derived from content root directory) */
  name: string;
  /** Where vault content lives (.napkin/ for embedded, parent dir for sibling/nested) */
  contentPath: string;
  /** Where config.json lives (always the .napkin/ directory) */
  configPath: string;
  /** Where .obsidian/ directory lives */
  obsidianPath: string;
}

/**
 * Walk up from startDir looking for .napkin/ (or .obsidian/.napkin/ for nested layout).
 * Resolves the vault layout from config to determine content, config, and obsidian paths.
 */
export function findVault(startDir?: string): VaultInfo {
  let dir = path.resolve(startDir || process.cwd());
  const root = path.parse(dir).root;

  while (true) {
    const napkinDir = path.join(dir, ".napkin");

    if (fs.existsSync(napkinDir) && fs.statSync(napkinDir).isDirectory()) {
      return resolveVaultLayout(napkinDir, dir);
    }

    // Check for nested layout: .obsidian/.napkin/
    const nestedNapkin = path.join(dir, ".obsidian", ".napkin");
    if (
      fs.existsSync(nestedNapkin) &&
      fs.statSync(nestedNapkin).isDirectory()
    ) {
      return resolveVaultLayout(nestedNapkin, dir);
    }

    const parent = path.dirname(dir);
    if (parent === dir || dir === root) {
      throw new Error(
        "No vault found. Run 'napkin init' to create one, or run this command inside a directory containing .napkin/.",
      );
    }
    dir = parent;
  }
}

/**
 * Resolve vault layout from .napkin/config.json vault paths.
 * If no vault config exists, assumes embedded layout (.napkin/ is the vault root).
 */
function resolveVaultLayout(napkinDir: string, projectDir: string): VaultInfo {
  const configPath = path.join(napkinDir, "config.json");
  let vaultConfig: { root?: string; obsidian?: string } | undefined;

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    vaultConfig = raw.vault;
  } catch {
    // no config or invalid — use defaults
  }

  if (vaultConfig?.root) {
    // Layout specified in config — resolve relative to .napkin/ dir
    const contentPath = path.resolve(napkinDir, vaultConfig.root);
    const obsidianPath = vaultConfig.obsidian
      ? path.resolve(napkinDir, vaultConfig.obsidian)
      : path.join(contentPath, ".obsidian");
    return {
      name: path.basename(contentPath),
      contentPath,
      configPath: napkinDir,
      obsidianPath,
    };
  }

  // Default: embedded layout — .napkin/ is the vault root
  return {
    name: path.basename(projectDir),
    contentPath: napkinDir,
    configPath: napkinDir,
    obsidianPath: path.join(napkinDir, ".obsidian"),
  };
}

/**
 * Read a JSON config file from .obsidian/ directory.
 * Returns parsed JSON or null if file doesn't exist.
 */
export function getVaultConfig(
  obsidianPath: string,
  configFile: string,
): Record<string, unknown> | null {
  const configPath = path.join(obsidianPath, configFile);
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
