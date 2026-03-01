import * as fs from "node:fs";
import * as path from "node:path";
import { bold, dim, type OutputOptions, output } from "../utils/output.js";

export interface InitOptions extends OutputOptions {
  path?: string;
  obsidian?: boolean;
}

/**
 * Initialize a new napkin vault.
 * Creates .napkin/ and .obsidian/ directories (for Obsidian compatibility).
 */
export async function init(opts: InitOptions) {
  const targetDir = path.resolve(opts.path || process.cwd());
  const napkinDir = path.join(targetDir, ".napkin");
  const obsidianDir = path.join(targetDir, ".obsidian");

  const napkinExists = fs.existsSync(napkinDir);
  const obsidianExists = fs.existsSync(obsidianDir);

  if (napkinExists && obsidianExists) {
    output(opts, {
      json: () => ({
        status: "exists",
        path: targetDir,
        napkin: true,
        obsidian: true,
      }),
      human: () => {
        console.log(
          `${dim("Vault already initialized at")} ${bold(targetDir)}`,
        );
      },
    });
    return;
  }

  // Create .napkin/ directory
  if (!napkinExists) {
    fs.mkdirSync(napkinDir, { recursive: true });
  }

  // Create .obsidian/ directory for Obsidian compatibility
  if (!obsidianExists) {
    fs.mkdirSync(obsidianDir, { recursive: true });
    // Minimal Obsidian config
    fs.writeFileSync(
      path.join(obsidianDir, "app.json"),
      JSON.stringify({ alwaysUpdateLinks: true }, null, 2),
    );
  }

  output(opts, {
    json: () => ({
      status: "created",
      path: targetDir,
      napkin: !napkinExists,
      obsidian: !obsidianExists,
    }),
    human: () => {
      console.log(`${dim("Initialized vault at")} ${bold(targetDir)}`);
      if (!napkinExists) console.log(`  ${dim("created")} .napkin/`);
      if (!obsidianExists) console.log(`  ${dim("created")} .obsidian/`);
    },
  });
}
