import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { init } from "./init.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "napkin-init-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("init command", () => {
  test("creates .napkin/ with config and .obsidian/", async () => {
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
    await init({ json: true, path: tmpDir });
    console.log = orig;

    const data = JSON.parse(logs.join(""));
    expect(data.status).toBe("created");
    expect(data.napkin).toBe(true);

    const nap = path.join(tmpDir, ".napkin");
    expect(fs.existsSync(nap)).toBe(true);
    expect(fs.existsSync(path.join(nap, "config.json"))).toBe(true);
    // .obsidian/ synced from config
    expect(fs.existsSync(path.join(nap, ".obsidian"))).toBe(true);
    expect(fs.existsSync(path.join(nap, ".obsidian", "app.json"))).toBe(true);
    expect(fs.existsSync(path.join(nap, ".obsidian", "daily-notes.json"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(nap, ".obsidian", "templates.json"))).toBe(
      true,
    );
  });

  test("reports exists when already initialized", async () => {
    // First init
    await init({ quiet: true, path: tmpDir });

    // Second init
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
    await init({ json: true, path: tmpDir });
    console.log = orig;

    const data = JSON.parse(logs.join(""));
    expect(data.status).toBe("exists");
  });

  test("creates config when only .napkin/ dir exists", async () => {
    // Create only .napkin/ with no config
    fs.mkdirSync(path.join(tmpDir, ".napkin"));

    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
    await init({ json: true, path: tmpDir });
    console.log = orig;

    const data = JSON.parse(logs.join(""));
    expect(data.status).toBe("created");

    const nap = path.join(tmpDir, ".napkin");
    expect(fs.existsSync(path.join(nap, "config.json"))).toBe(true);
    expect(fs.existsSync(path.join(nap, ".obsidian"))).toBe(true);
  });

  test("scaffolds template with dirs, files, and NAPKIN.md", async () => {
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
    await init({ json: true, path: tmpDir, template: "coding" });
    console.log = orig;

    const data = JSON.parse(logs.join(""));
    expect(data.status).toBe("created");
    expect(data.template).toBe("coding");
    expect(data.files).toContain("NAPKIN.md");
    expect(data.files).toContain("decisions/");
    expect(data.files).toContain("guides/");

    const nap = path.join(tmpDir, ".napkin");
    expect(fs.existsSync(path.join(nap, "NAPKIN.md"))).toBe(true);
    expect(fs.existsSync(path.join(nap, "decisions"))).toBe(true);
    expect(fs.existsSync(path.join(nap, "guides/_about.md"))).toBe(true);
    // Templates dir with note templates
    expect(fs.existsSync(path.join(nap, "Templates/Decision.md"))).toBe(true);
    expect(fs.existsSync(path.join(nap, "Templates/Guide.md"))).toBe(true);
  });

  test("template on existing vault adds template files", async () => {
    await init({ quiet: true, path: tmpDir });
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
    await init({ json: true, path: tmpDir, template: "company" });
    console.log = orig;

    const data = JSON.parse(logs.join(""));
    expect(data.status).toBe("created");
    expect(data.template).toBe("company");
    const nap2 = path.join(tmpDir, ".napkin");
    expect(fs.existsSync(path.join(nap2, "runbooks"))).toBe(true);
    expect(fs.existsSync(path.join(nap2, "NAPKIN.md"))).toBe(true);
    expect(fs.existsSync(path.join(nap2, "Templates/Runbook.md"))).toBe(true);
  });

  test("scaffolds all 5 templates", async () => {
    const templates = ["coding", "personal", "research", "company", "product"];
    for (const tmpl of templates) {
      const dir = fs.mkdtempSync(
        path.join(os.tmpdir(), `napkin-tmpl-${tmpl}-`),
      );
      const logs: string[] = [];
      const orig = console.log;
      console.log = (...args: unknown[]) =>
        logs.push(args.map(String).join(" "));
      await init({ json: true, path: dir, template: tmpl });
      console.log = orig;

      const data = JSON.parse(logs.join(""));
      expect(data.status).toBe("created");
      expect(data.template).toBe(tmpl);
      expect(data.files).toContain("NAPKIN.md");
      expect(data.files.length).toBeGreaterThan(3);

      const nap = path.join(dir, ".napkin");
      expect(fs.existsSync(path.join(nap, "NAPKIN.md"))).toBe(true);
      expect(fs.existsSync(path.join(nap, "Templates"))).toBe(true);

      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects invalid template name", async () => {
    const orig = process.exit;
    let exitCode: number | undefined;
    (process as any).exit = (code: number) => {
      exitCode = code;
      throw new Error("exit");
    };
    try {
      await init({ json: true, path: tmpDir, template: "doesnotexist" });
    } catch {
      // expected
    }
    (process as any).exit = orig;
    expect(exitCode).toBe(1);
  });

  test("vault root is .napkin/ directory", async () => {
    await init({ quiet: true, path: tmpDir, template: "coding" });

    const nap = path.join(tmpDir, ".napkin");
    // .napkin/ is the vault root
    expect(fs.existsSync(nap)).toBe(true);
    // .obsidian/ lives inside .napkin/
    expect(fs.existsSync(path.join(nap, ".obsidian"))).toBe(true);
    expect(fs.existsSync(path.join(nap, ".obsidian", "app.json"))).toBe(true);
    // Template content is inside .napkin/
    expect(fs.existsSync(path.join(nap, "decisions"))).toBe(true);
    expect(fs.existsSync(path.join(nap, "NAPKIN.md"))).toBe(true);
    // Nothing scaffolded in parent dir
    expect(fs.existsSync(path.join(tmpDir, "decisions"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, "NAPKIN.md"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, "Templates"))).toBe(false);
  });
});
