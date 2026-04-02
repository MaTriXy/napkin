import * as fs from "node:fs";
import * as path from "node:path";
import { EXIT_NOT_FOUND, EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { listFiles, resolveFile, suggestFile } from "../utils/files.js";
import { extractTasks, type Task } from "../utils/markdown.js";
import {
  bold,
  dim,
  error,
  fileNotFound,
  type OutputOptions,
  output,
} from "../utils/output.js";
import { findVault, type VaultInfo } from "../utils/vault.js";
import { getDailyPath } from "./daily.js";

interface TaskWithFile extends Task {
  file: string;
}

function collectTasks(
  vault: VaultInfo,
  opts: { file?: string; daily?: boolean },
): TaskWithFile[] {
  let files: string[];

  if (opts.daily) {
    const dp = getDailyPath(vault.configPath);
    files = fs.existsSync(path.join(vault.contentPath, dp)) ? [dp] : [];
  } else if (opts.file) {
    const r = resolveFile(vault.contentPath, opts.file);
    files = r ? [r] : [];
  } else {
    files = listFiles(vault.contentPath, { ext: "md" });
  }

  const results: TaskWithFile[] = [];
  for (const file of files) {
    const content = fs.readFileSync(
      path.join(vault.contentPath, file),
      "utf-8",
    );
    const tasks = extractTasks(content);
    for (const t of tasks) {
      results.push({ ...t, file });
    }
  }
  return results;
}

export async function tasks(
  opts: OutputOptions & {
    vault?: string;
    file?: string;
    done?: boolean;
    todo?: boolean;
    total?: boolean;
    verbose?: boolean;
    daily?: boolean;
    status?: string;
  },
) {
  const v = findVault(opts.vault);
  let result = collectTasks(v, {
    file: opts.file,
    daily: opts.daily,
  });

  if (opts.done) result = result.filter((t) => t.done);
  if (opts.todo) result = result.filter((t) => !t.done);
  if (opts.status) result = result.filter((t) => t.status === opts.status);

  output(opts, {
    json: () => (opts.total ? { total: result.length } : { tasks: result }),
    human: () => {
      if (opts.total) {
        console.log(result.length);
      } else if (opts.verbose) {
        const byFile = new Map<string, TaskWithFile[]>();
        for (const t of result) {
          if (!byFile.has(t.file)) byFile.set(t.file, []);
          byFile.get(t.file)?.push(t);
        }
        for (const [file, tasks] of byFile) {
          console.log(bold(file));
          for (const t of tasks) {
            console.log(`  ${dim(`${t.line}:`)} [${t.status}] ${t.text}`);
          }
        }
      } else {
        for (const t of result) {
          console.log(`[${t.status}] ${t.text}`);
        }
      }
    },
  });
}

export async function task(
  opts: OutputOptions & {
    vault?: string;
    file?: string;
    line?: string;
    ref?: string;
    toggle?: boolean;
    done?: boolean;
    todo?: boolean;
    status?: string;
    daily?: boolean;
  },
) {
  const v = findVault(opts.vault);

  let filePath: string;
  let lineNum: number;

  if (opts.ref) {
    const parts = opts.ref.split(":");
    if (parts.length !== 2) {
      error("Invalid ref format. Use --ref <path:line>");
      process.exit(EXIT_USER_ERROR);
    }
    const resolved = resolveFile(v.contentPath, parts[0]);
    if (!resolved) {
      fileNotFound(parts[0], suggestFile(v.contentPath, parts[0]));
      process.exit(EXIT_NOT_FOUND);
    }
    filePath = resolved;
    lineNum = Number.parseInt(parts[1], 10);
  } else if (opts.daily) {
    filePath = getDailyPath(v.configPath);
    lineNum = Number.parseInt(opts.line || "0", 10);
  } else {
    if (!opts.file || !opts.line) {
      error("Specify --file and --line, or --ref <path:line>");
      process.exit(EXIT_USER_ERROR);
    }
    const resolved = resolveFile(v.contentPath, opts.file);
    if (!resolved) {
      fileNotFound(opts.file, suggestFile(v.contentPath, opts.file));
      process.exit(EXIT_NOT_FOUND);
    }
    filePath = resolved;
    lineNum = Number.parseInt(opts.line, 10);
  }

  const fullPath = path.join(v.contentPath, filePath);
  if (!fs.existsSync(fullPath)) {
    fileNotFound(filePath, suggestFile(v.contentPath, filePath));
    process.exit(EXIT_NOT_FOUND);
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");
  const targetLine = lines[lineNum - 1];

  if (!targetLine) {
    error(`Line ${lineNum} not found in ${filePath}`);
    process.exit(EXIT_NOT_FOUND);
  }

  const taskMatch = targetLine.match(/^([\s]*[-*]\s+\[)(.)(].*)$/);
  if (!taskMatch) {
    error(`Line ${lineNum} is not a task`);
    process.exit(EXIT_USER_ERROR);
  }

  const currentStatus = taskMatch[2];
  const isMutating = opts.toggle || opts.done || opts.todo || opts.status;

  if (isMutating) {
    let newStatus: string;
    if (opts.status) newStatus = opts.status;
    else if (opts.done) newStatus = "x";
    else if (opts.todo) newStatus = " ";
    else if (opts.toggle) newStatus = currentStatus === " " ? "x" : " ";
    else newStatus = currentStatus;

    lines[lineNum - 1] = `${taskMatch[1]}${newStatus}${taskMatch[3]}`;
    fs.writeFileSync(fullPath, lines.join("\n"));

    output(opts, {
      json: () => ({
        file: filePath,
        line: lineNum,
        status: newStatus,
        text: taskMatch[3].slice(2),
      }),
      human: () => console.log(`[${newStatus}] ${taskMatch[3].slice(2)}`),
    });
  } else {
    output(opts, {
      json: () => ({
        file: filePath,
        line: lineNum,
        status: currentStatus,
        text: taskMatch[3].slice(2),
        done: currentStatus === "x" || currentStatus === "X",
      }),
      human: () => {
        console.log(`${dim("file")}    ${filePath}`);
        console.log(`${dim("line")}    ${lineNum}`);
        console.log(`${dim("status")}  [${currentStatus}]`);
        console.log(`${dim("text")}    ${taskMatch[3].slice(2)}`);
      },
    });
  }
}
