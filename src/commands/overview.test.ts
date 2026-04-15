import { describe, expect, test } from "bun:test";
import { createTempVault } from "../utils/test-helpers.js";
import { overview } from "./overview.js";

describe("overview", () => {
  test("generates overview for vault with folders", async () => {
    const vault = createTempVault({
      "projects/roadmap.md":
        "---\ntags: [active]\n---\n# Roadmap\nLaunch the product in Q2",
      "projects/design.md": "# Design\nUI mockups and #wireframes",
      "notes/meeting.md": "# Meeting Notes\nDiscussed #hiring timeline",
      "readme.md": "# Welcome\nThis is the vault root",
    });

    // Test JSON output by capturing
    const captured: unknown[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => captured.push(...args);
    await overview({
      vault: vault.path,
      json: true,
      quiet: false,
      copy: false,
    });
    console.log = origLog;

    const result = JSON.parse(captured[0] as string);
    expect(result.overview).toBeArray();
    expect(result.overview.length).toBeGreaterThanOrEqual(3);

    const projectsFolder = result.overview.find(
      (f: { path: string }) => f.path === "projects",
    );
    expect(projectsFolder).toBeDefined();
    expect(projectsFolder.notes).toBe(2);
    expect(projectsFolder.tags).toContain("active");

    vault.cleanup();
  });

  test("respects depth limit", async () => {
    const vault = createTempVault({
      "a/b/c/deep.md": "# Deep note",
      "top.md": "# Top",
    });

    const captured: unknown[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => captured.push(...args);
    await overview({
      vault: vault.path,
      json: true,
      quiet: false,
      copy: false,
      depth: "1",
    });
    console.log = origLog;

    const result = JSON.parse(captured[0] as string);
    const paths = result.overview.map((f: { path: string }) => f.path);
    expect(paths).not.toContain("a/b/c");

    vault.cleanup();
  });

  test("skips files with malformed YAML frontmatter", async () => {
    const vault = createTempVault({
      "notes/good.md": "---\ntags: [valid]\n---\n# Good note\nHello",
      "notes/bad.md":
        "---\ntags: [#foo, #bar]\n---\n# Bad YAML\nBroken frontmatter",
      "notes/also-good.md": "# No frontmatter\nJust content",
    });

    const warnings: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      const msg = args.map(String).join(" ");
      if (msg.includes("⚠")) warnings.push(msg);
      else captured.push(...args);
    };
    const captured: unknown[] = [];
    await overview({
      vault: vault.path,
      json: true,
      quiet: false,
      copy: false,
    });
    console.log = origLog;

    const result = JSON.parse(captured[0] as string);
    const notesFolder = result.overview.find(
      (f: { path: string }) => f.path === "notes",
    );
    expect(notesFolder).toBeDefined();
    // bad.md is skipped for keywords/tags but still counted
    expect(notesFolder.notes).toBe(3);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("bad.md");

    vault.cleanup();
  });

  test("empty vault", async () => {
    const vault = createTempVault({});

    const captured: unknown[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => captured.push(...args);
    await overview({
      vault: vault.path,
      json: true,
      quiet: false,
      copy: false,
    });
    console.log = origLog;

    const result = JSON.parse(captured[0] as string);
    expect(result.overview).toEqual([]);

    vault.cleanup();
  });
});
