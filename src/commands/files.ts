import { exec } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { EXIT_NOT_FOUND } from "../utils/exit-codes.js";
import {
  getFileInfo,
  listFiles,
  listFolders,
  resolveFile,
  suggestFile,
} from "../utils/files.js";
import {
  bold,
  dim,
  error,
  fileNotFound,
  type OutputOptions,
  output,
} from "../utils/output.js";
import { findVault } from "../utils/vault.js";

export async function file(
  fileRef: string | undefined,
  opts: OutputOptions & { vault?: string },
) {
  const v = findVault(opts.vault);
  if (!fileRef) {
    error("No file specified. Usage: obsidian-cli file <name>");
    process.exit(EXIT_NOT_FOUND);
  }
  const resolved = resolveFile(v.contentPath, fileRef);
  if (!resolved) {
    fileNotFound(fileRef, suggestFile(v.contentPath, fileRef));
    process.exit(EXIT_NOT_FOUND);
  }
  const info = getFileInfo(v.contentPath, resolved);

  output(opts, {
    json: () => info,
    human: () => {
      console.log(`${dim("path")}       ${info.path}`);
      console.log(`${dim("name")}       ${bold(info.name)}`);
      console.log(`${dim("extension")}  ${info.extension}`);
      console.log(`${dim("size")}       ${info.size}`);
      console.log(`${dim("created")}    ${Math.floor(info.created)}`);
      console.log(`${dim("modified")}   ${Math.floor(info.modified)}`);
    },
  });
}

export async function files(
  opts: OutputOptions & {
    vault?: string;
    folder?: string;
    ext?: string;
    total?: boolean;
  },
) {
  const v = findVault(opts.vault);
  const result = listFiles(v.contentPath, {
    folder: opts.folder,
    ext: opts.ext,
  });

  output(opts, {
    json: () => (opts.total ? { total: result.length } : { files: result }),
    human: () => {
      if (opts.total) {
        console.log(result.length);
      } else {
        for (const f of result) console.log(f);
      }
    },
  });
}

export async function folders(
  opts: OutputOptions & { vault?: string; folder?: string; total?: boolean },
) {
  const v = findVault(opts.vault);
  const result = listFolders(v.contentPath, opts.folder);

  output(opts, {
    json: () => (opts.total ? { total: result.length } : { folders: result }),
    human: () => {
      if (opts.total) {
        console.log(result.length);
      } else {
        for (const f of result) console.log(f);
      }
    },
  });
}

export async function folder(
  folderPath: string | undefined,
  opts: OutputOptions & { vault?: string; info?: string },
) {
  const v = findVault(opts.vault);
  if (!folderPath) {
    error("No folder specified. Usage: obsidian-cli folder <path>");
    process.exit(EXIT_NOT_FOUND);
  }

  const fullPath = path.join(v.contentPath, folderPath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    error(`Folder not found: ${folderPath}`);
    process.exit(EXIT_NOT_FOUND);
  }

  const fileCount = listFiles(v.contentPath, { folder: folderPath }).length;
  const folderCount = listFolders(v.contentPath, folderPath).length;

  let size = 0;
  const allFiles = listFiles(v.contentPath, { folder: folderPath });
  for (const f of allFiles) {
    size += fs.statSync(path.join(v.contentPath, f)).size;
  }

  if (opts.info) {
    const val =
      opts.info === "files"
        ? fileCount
        : opts.info === "folders"
          ? folderCount
          : size;
    output(opts, {
      json: () => ({ [opts.info as string]: val }),
      human: () => console.log(val),
    });
    return;
  }

  output(opts, {
    json: () => ({
      path: folderPath,
      files: fileCount,
      folders: folderCount,
      size,
    }),
    human: () => {
      console.log(`${dim("path")}      ${folderPath}`);
      console.log(`${dim("files")}     ${fileCount}`);
      console.log(`${dim("folders")}   ${folderCount}`);
      console.log(`${dim("size")}      ${size}`);
    },
  });
}

export async function open(
  fileRef: string | undefined,
  opts: OutputOptions & { vault?: string; newtab?: boolean },
) {
  const v = findVault(opts.vault);
  const vaultName = encodeURIComponent(v.name);

  let uri: string;
  if (fileRef) {
    const resolved = resolveFile(v.contentPath, fileRef);
    if (!resolved) {
      fileNotFound(fileRef, suggestFile(v.contentPath, fileRef));
      process.exit(EXIT_NOT_FOUND);
    }
    const encodedFile = encodeURIComponent(resolved.replace(/\.md$/, ""));
    uri = `obsidian://open?vault=${vaultName}&file=${encodedFile}`;
  } else {
    uri = `obsidian://open?vault=${vaultName}`;
  }

  exec(`open "${uri}"`);

  output(opts, {
    json: () => ({ uri }),
    human: () => console.log(uri),
  });
}
