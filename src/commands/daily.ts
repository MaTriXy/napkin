import * as fs from "node:fs";
import * as path from "node:path";
import { EXIT_NOT_FOUND, EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { parseFrontmatter } from "../utils/frontmatter.js";
import { error, type OutputOptions, output, success } from "../utils/output.js";
import { findVault, getVaultConfig } from "../utils/vault.js";

interface DailyConfig {
  folder: string;
  format: string;
  template: string;
}

function getDailyConfig(vaultPath: string): DailyConfig {
  const config = getVaultConfig(
    vaultPath,
    "daily-notes.json",
  ) as Partial<DailyConfig> | null;
  return {
    folder: config?.folder || "",
    format: config?.format || "YYYY-MM-DD",
    template: config?.template || "",
  };
}

/**
 * Format a date using moment.js-style tokens.
 * Supports: YYYY, YY, MM, M, DD, D, ddd, dddd, HH, H, mm, m, ss, s
 */
function formatDate(date: Date, format: string): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return format
    .replace(/YYYY/g, String(date.getFullYear()))
    .replace(/YY/g, String(date.getFullYear()).slice(-2))
    .replace(/MM/g, String(date.getMonth() + 1).padStart(2, "0"))
    .replace(/M/g, String(date.getMonth() + 1))
    .replace(/DD/g, String(date.getDate()).padStart(2, "0"))
    .replace(/D/g, String(date.getDate()))
    .replace(/dddd/g, days[date.getDay()])
    .replace(/ddd/g, shortDays[date.getDay()])
    .replace(/HH/g, String(date.getHours()).padStart(2, "0"))
    .replace(/H/g, String(date.getHours()))
    .replace(/mm/g, String(date.getMinutes()).padStart(2, "0"))
    .replace(/ss/g, String(date.getSeconds()).padStart(2, "0"));
}

export function getDailyPath(vaultPath: string, date?: Date): string {
  const config = getDailyConfig(vaultPath);
  const d = date || new Date();
  const filename = formatDate(d, config.format);
  const folder = config.folder || "";
  return folder ? `${folder}/${filename}.md` : `${filename}.md`;
}

export async function daily(opts: OutputOptions & { vault?: string }) {
  const v = findVault(opts.vault);
  const dailyPath = getDailyPath(v.path);
  const fullPath = path.join(v.path, dailyPath);

  // Create if doesn't exist
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    const config = getDailyConfig(v.path);
    let content = "";
    if (config.template) {
      const templatePath = path.join(v.path, `${config.template}.md`);
      if (fs.existsSync(templatePath)) {
        content = fs.readFileSync(templatePath, "utf-8");
      }
    }
    fs.writeFileSync(fullPath, content);
  }

  output(opts, {
    json: () => ({ path: dailyPath, created: !fs.existsSync(fullPath) }),
    human: () => success(`Daily note: ${dailyPath}`),
  });
}

export async function dailyPath(opts: OutputOptions & { vault?: string }) {
  const v = findVault(opts.vault);
  const dp = getDailyPath(v.path);

  output(opts, {
    json: () => ({ path: dp }),
    human: () => console.log(dp),
  });
}

export async function dailyRead(opts: OutputOptions & { vault?: string }) {
  const v = findVault(opts.vault);
  const dp = getDailyPath(v.path);
  const fullPath = path.join(v.path, dp);

  if (!fs.existsSync(fullPath)) {
    error(`Daily note not found: ${dp}`);
    process.exit(EXIT_NOT_FOUND);
  }

  const content = fs.readFileSync(fullPath, "utf-8");

  output(opts, {
    json: () => ({ path: dp, content }),
    human: () => console.log(content),
  });
}

export async function dailyAppend(
  opts: OutputOptions & { vault?: string; content?: string; inline?: boolean },
) {
  const v = findVault(opts.vault);
  if (!opts.content) {
    error("No content specified. Use --content <text>");
    process.exit(EXIT_USER_ERROR);
  }

  const dp = getDailyPath(v.path);
  const fullPath = path.join(v.path, dp);

  // Create if doesn't exist
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "");
  }

  const existing = fs.readFileSync(fullPath, "utf-8");
  const separator = opts.inline ? "" : "\n";
  fs.writeFileSync(fullPath, existing + separator + opts.content);

  output(opts, {
    json: () => ({ path: dp, appended: true }),
    human: () => success(`Appended to ${dp}`),
  });
}

export async function dailyPrepend(
  opts: OutputOptions & { vault?: string; content?: string; inline?: boolean },
) {
  const v = findVault(opts.vault);
  if (!opts.content) {
    error("No content specified. Use --content <text>");
    process.exit(EXIT_USER_ERROR);
  }

  const dp = getDailyPath(v.path);
  const fullPath = path.join(v.path, dp);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "");
  }

  const existing = fs.readFileSync(fullPath, "utf-8");
  const separator = opts.inline ? "" : "\n";
  const { properties, body, raw } = parseFrontmatter(existing);

  if (Object.keys(properties).length > 0) {
    const frontmatter = `---\n${raw}\n---\n`;
    fs.writeFileSync(fullPath, frontmatter + opts.content + separator + body);
  } else {
    fs.writeFileSync(fullPath, opts.content + separator + existing);
  }

  output(opts, {
    json: () => ({ path: dp, prepended: true }),
    human: () => success(`Prepended to ${dp}`),
  });
}
