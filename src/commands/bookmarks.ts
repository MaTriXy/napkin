import * as fs from "node:fs";
import * as path from "node:path";
import { EXIT_USER_ERROR } from "../utils/exit-codes.js";
import {
  dim,
  error,
  type OutputOptions,
  output,
  success,
} from "../utils/output.js";
import { findVault } from "../utils/vault.js";

interface Bookmark {
  type: string;
  title?: string;
  path?: string;
  query?: string;
  url?: string;
  subpath?: string;
  items?: Bookmark[];
}

function readBookmarks(obsidianPath: string): Bookmark[] {
  const configPath = path.join(obsidianPath, "bookmarks.json");
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content) as Bookmark[];
  } catch {
    return [];
  }
}

function writeBookmarks(obsidianPath: string, bookmarks: Bookmark[]): void {
  const configPath = path.join(obsidianPath, "bookmarks.json");
  fs.writeFileSync(configPath, JSON.stringify(bookmarks, null, 2));
}

function flattenBookmarks(items: Bookmark[]): Bookmark[] {
  const result: Bookmark[] = [];
  for (const item of items) {
    if (item.type === "group" && item.items) {
      result.push(...flattenBookmarks(item.items));
    } else {
      result.push(item);
    }
  }
  return result;
}

export async function bookmarks(
  opts: OutputOptions & {
    vault?: string;
    total?: boolean;
    verbose?: boolean;
  },
) {
  const v = findVault(opts.vault);
  const items = readBookmarks(v.obsidianPath);
  const flat = flattenBookmarks(items);

  output(opts, {
    json: () => (opts.total ? { total: flat.length } : { bookmarks: flat }),
    human: () => {
      if (opts.total) {
        console.log(flat.length);
      } else {
        for (const b of flat) {
          const label = b.title || b.path || b.query || b.url || "(untitled)";
          console.log(opts.verbose ? `${label}\t${dim(b.type)}` : label);
        }
      }
    },
  });
}

export async function bookmark(
  opts: OutputOptions & {
    vault?: string;
    file?: string;
    subpath?: string;
    folder?: string;
    search?: string;
    url?: string;
    title?: string;
  },
) {
  const v = findVault(opts.vault);

  let entry: Bookmark;
  if (opts.file) {
    entry = {
      type: "file",
      path: opts.file,
      title: opts.title,
      subpath: opts.subpath,
    };
  } else if (opts.folder) {
    entry = { type: "folder", path: opts.folder, title: opts.title };
  } else if (opts.search) {
    entry = { type: "search", query: opts.search, title: opts.title };
  } else if (opts.url) {
    entry = { type: "url", url: opts.url, title: opts.title };
  } else {
    error("Specify --file, --folder, --search, or --url to bookmark");
    process.exit(EXIT_USER_ERROR);
  }

  const items = readBookmarks(v.obsidianPath);
  items.push(entry);
  writeBookmarks(v.obsidianPath, items);

  output(opts, {
    json: () => ({ added: entry }),
    human: () =>
      success(`Bookmarked ${entry.path || entry.query || entry.url}`),
  });
}
