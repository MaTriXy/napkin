import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTempVault } from "../utils/test-helpers.js";
import { search, searchContext } from "./search.js";

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
    "Projects/alpha.md": "# Alpha\nThis is the alpha project\nWith TODO items",
    "Projects/beta.md": "# Beta\nBeta has no tasks",
    "Resources/guide.md": "# Guide\nRefer to the alpha project here",
    "README.md": "# Vault\nWelcome to the vault",
  });
});

afterEach(() => {
  v.cleanup();
});

describe("search", () => {
  test("finds files matching query", async () => {
    const data = await captureJson(() => search({ json: true, vault: v.path, query: "alpha" }));
    const files = data.files as string[];
    expect(files).toContain("Projects/alpha.md");
    expect(files).toContain("Resources/guide.md");
    expect(files.length).toBe(2);
  });

  test("filters by folder", async () => {
    const data = await captureJson(() => search({ json: true, vault: v.path, query: "alpha", path: "Projects" }));
    const files = data.files as string[];
    expect(files.length).toBe(1);
    expect(files[0]).toBe("Projects/alpha.md");
  });

  test("returns total", async () => {
    const data = await captureJson(() => search({ json: true, vault: v.path, query: "alpha", total: true }));
    expect(data.total).toBe(2);
  });

  test("case sensitive search", async () => {
    const data = await captureJson(() => search({ json: true, vault: v.path, query: "Alpha", case: true }));
    const files = data.files as string[];
    // Only alpha.md has "Alpha" with capital A
    expect(files).toContain("Projects/alpha.md");
  });

  test("limits results", async () => {
    const data = await captureJson(() => search({ json: true, vault: v.path, query: "the", limit: "1" }));
    const files = data.files as string[];
    expect(files.length).toBe(1);
  });
});

describe("searchContext", () => {
  test("returns line context", async () => {
    const data = await captureJson(() => searchContext({ json: true, vault: v.path, query: "TODO" }));
    const results = data.results as { file: string; line: number; text: string }[];
    expect(results.length).toBe(1);
    expect(results[0].file).toBe("Projects/alpha.md");
    expect(results[0].text).toContain("TODO");
    expect(results[0].line).toBe(3);
  });
});
