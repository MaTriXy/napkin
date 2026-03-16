import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTempVault } from "../utils/test-helpers.js";
import { vault } from "./vault.js";

let v: { path: string; vaultPath: string; cleanup: () => void };

beforeEach(() => {
  v = createTempVault({
    "README.md": "# Vault",
    "Projects/note.md": "note",
    "Resources/guide.md": "guide",
  });
});

afterEach(() => {
  v.cleanup();
});

describe("vault command", () => {
  test("outputs json with vault info", async () => {
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
    await vault({ json: true, vault: v.path });
    console.log = orig;

    const data = JSON.parse(logs.join(""));
    expect(data.name).toBeTruthy();
    expect(data.path).toBe(v.vaultPath);
    expect(data.files).toBe(3);
    expect(data.folders).toBe(2);
    expect(data.size).toBeGreaterThan(0);
  });
});
