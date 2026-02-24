import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTempVault } from "../utils/test-helpers.js";
import { templates, templateRead, templateInsert } from "./templates.js";

let v: { path: string; cleanup: () => void };

function captureJson(fn: () => Promise<void>): Promise<Record<string, unknown>> {
  return new Promise(async (resolve) => {
    const orig = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
    await fn();
    console.log = orig;
    resolve(JSON.parse(logs.join("")));
  });
}

beforeEach(() => {
  v = createTempVault({
    "Templates/Daily Note.md": "# {{date}}\n\n## Tasks\n- [ ] {{title}}",
    "Templates/Meeting Note.md": "# Meeting: {{title}}\n\nTime: {{time}}\n",
  });
});

afterEach(() => {
  v.cleanup();
});

describe("templates", () => {
  test("lists templates", async () => {
    const data = await captureJson(() => templates({ json: true, vault: v.path }));
    const t = data.templates as string[];
    expect(t).toContain("Daily Note");
    expect(t).toContain("Meeting Note");
  });

  test("returns total", async () => {
    const data = await captureJson(() => templates({ json: true, vault: v.path, total: true }));
    expect(data.total).toBe(2);
  });
});

describe("templateRead", () => {
  test("reads raw template", async () => {
    const data = await captureJson(() => templateRead({ json: true, vault: v.path, name: "Daily Note" }));
    expect(data.content).toContain("{{date}}");
  });

  test("resolves template variables", async () => {
    const data = await captureJson(() =>
      templateRead({ json: true, vault: v.path, name: "Meeting Note", resolve: true, title: "Standup" }),
    );
    const content = data.content as string;
    expect(content).not.toContain("{{title}}");
    expect(content).toContain("Standup");
    expect(content).not.toContain("{{time}}");
  });
});

describe("templateInsert", () => {
  test("inserts template into file with resolved variables", async () => {
    const fs = require("node:fs");
    const path = require("node:path");
    // Create a target file
    fs.writeFileSync(path.join(v.path, "target.md"), "# Existing\n\n");

    const data = await captureJson(() =>
      templateInsert({ json: true, vault: v.path, name: "Daily Note", file: "target" }),
    );
    expect(data.inserted).toBe(true);

    const content = fs.readFileSync(path.join(v.path, "target.md"), "utf-8");
    expect(content).toContain("# Existing");
    // Template variables should be resolved
    expect(content).not.toContain("{{date}}");
    expect(content).not.toContain("{{title}}");
    expect(content).toContain("target"); // {{title}} resolved to filename
  });
});
