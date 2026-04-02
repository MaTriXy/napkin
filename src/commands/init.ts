import * as fs from "node:fs";
import * as path from "node:path";
import { TEMPLATES, type VaultTemplate } from "../templates/index.js";
import {
  DEFAULT_CONFIG,
  type NapkinConfig,
  saveConfig,
} from "../utils/config.js";
import {
  bold,
  dim,
  error,
  type OutputOptions,
  output,
  success,
} from "../utils/output.js";

export interface InitOptions extends OutputOptions {
  path?: string;
  template?: string;
}

function scaffoldTemplate(
  targetDir: string,
  template: VaultTemplate,
): string[] {
  const created: string[] = [];

  for (const dir of template.dirs) {
    const dirPath = path.join(targetDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      created.push(`${dir}/`);
    }
  }

  for (const [filePath, content] of Object.entries(template.files)) {
    const fullPath = path.join(targetDir, filePath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
      created.push(filePath);
    }
  }

  const napkinPath = path.join(targetDir, "NAPKIN.md");
  if (!fs.existsSync(napkinPath)) {
    fs.writeFileSync(napkinPath, template.napkinMd);
    created.push("NAPKIN.md");
  }

  return created;
}

export async function init(opts: InitOptions) {
  const targetDir = path.resolve(opts.path || process.cwd());
  const napkinDir = path.join(targetDir, ".napkin");
  const existingObsidian = path.join(targetDir, ".obsidian");
  const isSiblingLayout =
    fs.existsSync(existingObsidian) &&
    fs.statSync(existingObsidian).isDirectory();

  const napkinExists = fs.existsSync(napkinDir);
  const configExists = fs.existsSync(path.join(napkinDir, "config.json"));

  if (napkinExists && configExists && !opts.template) {
    output(opts, {
      json: () => ({
        status: "exists",
        path: napkinDir,
      }),
      human: () => {
        console.log(
          `${dim("Vault already initialized at")} ${bold(napkinDir)}`,
        );
      },
    });
    return;
  }

  if (opts.template && !TEMPLATES[opts.template]) {
    error(
      `Unknown template: ${opts.template}. Available: ${Object.keys(TEMPLATES).join(", ")}`,
    );
    process.exit(1);
  }

  if (!napkinExists) {
    fs.mkdirSync(napkinDir, { recursive: true });
  }

  // Write config.json and sync .obsidian/
  if (!fs.existsSync(path.join(napkinDir, "config.json"))) {
    if (isSiblingLayout) {
      // Existing Obsidian vault — sibling layout
      const config: NapkinConfig = {
        ...DEFAULT_CONFIG,
        vault: { root: "..", obsidian: "../.obsidian" },
      };
      // Save config to .napkin/ but sync .obsidian/ to the existing location
      saveConfig(napkinDir, config, existingObsidian);
    } else {
      saveConfig(napkinDir, DEFAULT_CONFIG);
    }
  }

  // Content root: for sibling layout, scaffold in targetDir; for embedded, in .napkin/
  const contentRoot = isSiblingLayout ? targetDir : napkinDir;

  let templateFiles: string[] = [];
  if (opts.template) {
    templateFiles = scaffoldTemplate(contentRoot, TEMPLATES[opts.template]);
  }

  output(opts, {
    json: () => ({
      status: "created",
      path: napkinDir,
      napkin: !napkinExists,
      template: opts.template || null,
      files: templateFiles,
    }),
    human: () => {
      console.log(`${dim("Initialized vault at")} ${bold(napkinDir)}`);
      if (!napkinExists) console.log(`  ${dim("created")} .napkin/`);
      if (!configExists) console.log(`  ${dim("created")} config.json`);
      if (isSiblingLayout)
        console.log(
          `  ${dim("layout")}  sibling (existing .obsidian/ detected)`,
        );
      if (opts.template) {
        console.log(`  ${dim("template")} ${bold(opts.template)}`);
        for (const f of templateFiles) {
          console.log(`  ${dim("created")} ${f}`);
        }
      }
      console.log("");
      const napkinMdPath = isSiblingLayout ? "NAPKIN.md" : ".napkin/NAPKIN.md";
      success(`Edit ${napkinMdPath} to set your context.`);
    },
  });
}

export async function initTemplates(opts: OutputOptions) {
  const templates = Object.values(TEMPLATES).map((t) => ({
    name: t.name,
    description: t.description,
    dirs: t.dirs,
  }));

  output(opts, {
    json: () => ({ templates }),
    human: () => {
      for (const t of templates) {
        console.log(`${bold(t.name)} — ${t.description}`);
        console.log(`  ${dim("folders:")} ${t.dirs.join(", ")}`);
      }
    },
  });
}
