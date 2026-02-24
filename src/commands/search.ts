import * as fs from "node:fs";
import * as path from "node:path";
import MiniSearch from "minisearch";
import { findVault } from "../utils/vault.js";
import { listFiles } from "../utils/files.js";
import { type OutputOptions, output, error } from "../utils/output.js";
import { EXIT_USER_ERROR } from "../utils/exit-codes.js";

interface SearchOpts extends OutputOptions {
  vault?: string;
  query?: string;
  path?: string;
  limit?: string;
  total?: boolean;
}

function buildIndex(vaultPath: string, folder?: string) {
  const files = listFiles(vaultPath, { folder, ext: "md" });

  const docs = files.map((file, id) => {
    const fullPath = path.join(vaultPath, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    const basename = path.basename(file, ".md");
    return { id, file, basename, content };
  });

  const index = new MiniSearch({
    fields: ["basename", "content"],
    storeFields: ["file"],
    searchOptions: {
      boost: { basename: 2 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  index.addAll(docs);
  return { index, docs };
}

export async function search(opts: SearchOpts) {
  const v = findVault(opts.vault);
  if (!opts.query) {
    error("No query specified. Use --query <text>");
    process.exit(EXIT_USER_ERROR);
  }

  const { index } = buildIndex(v.path, opts.path);
  const results = index.search(opts.query);
  const limit = opts.limit ? Number.parseInt(opts.limit) : undefined;
  const matches = limit ? results.slice(0, limit) : results;
  const files = matches.map((r) => r.file as string);

  output(opts, {
    json: () => (opts.total ? { total: files.length } : { files }),
    human: () => {
      if (opts.total) {
        console.log(files.length);
      } else {
        for (const f of files) console.log(f);
      }
    },
  });
}

export async function searchContext(opts: SearchOpts) {
  const v = findVault(opts.vault);
  if (!opts.query) {
    error("No query specified. Use --query <text>");
    process.exit(EXIT_USER_ERROR);
  }

  const { index, docs } = buildIndex(v.path, opts.path);
  const results = index.search(opts.query);
  const limit = opts.limit ? Number.parseInt(opts.limit) : undefined;
  const matches = limit ? results.slice(0, limit) : results;

  const q = opts.query.toLowerCase();
  const contexts: { file: string; line: number; text: string }[] = [];

  for (const result of matches) {
    const doc = docs[result.id];
    const lines = doc.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        contexts.push({ file: doc.file, line: i + 1, text: lines[i] });
      }
    }
  }

  output(opts, {
    json: () => (opts.total ? { total: contexts.length } : { results: contexts }),
    human: () => {
      if (opts.total) {
        console.log(contexts.length);
      } else {
        for (const c of contexts) console.log(`${c.file}:${c.line}: ${c.text}`);
      }
    },
  });
}
