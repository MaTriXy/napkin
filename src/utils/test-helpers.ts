import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Create a temporary vault for testing. Returns path and cleanup function.
 */
export function createTempVault(files?: Record<string, string>): {
  path: string;
  cleanup: () => void;
} {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "obsidian-cli-test-"));
  const obsidianDir = path.join(tmpDir, ".obsidian");
  fs.mkdirSync(obsidianDir, { recursive: true });

  // Minimal obsidian config
  fs.writeFileSync(
    path.join(obsidianDir, "app.json"),
    JSON.stringify({ alwaysUpdateLinks: true }),
  );
  fs.writeFileSync(
    path.join(obsidianDir, "daily-notes.json"),
    JSON.stringify({
      folder: "Inbox/Daily",
      format: "YYYY-MM-DD",
      template: "Templates/Daily Note",
    }),
  );

  // Write any provided files
  if (files) {
    for (const [filePath, content] of Object.entries(files)) {
      const full = path.join(tmpDir, filePath);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
  }

  return {
    path: tmpDir,
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
  };
}
