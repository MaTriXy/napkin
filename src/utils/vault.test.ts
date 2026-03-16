import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createTempVault } from "./test-helpers.js";
import { findVault, getVaultConfig } from "./vault.js";

let vault: { path: string; vaultPath: string; cleanup: () => void };

beforeEach(() => {
  vault = createTempVault();
});

afterEach(() => {
  vault.cleanup();
});

describe("findVault", () => {
  test("finds vault from project root", () => {
    const result = findVault(vault.path);
    expect(result.path).toBe(path.join(vault.path, ".napkin"));
  });

  test("finds vault from subdirectory", () => {
    const sub = path.join(vault.path, "some", "nested", "dir");
    fs.mkdirSync(sub, { recursive: true });
    const result = findVault(sub);
    expect(result.path).toBe(path.join(vault.path, ".napkin"));
  });

  test("throws when no vault found", () => {
    expect(() => findVault("/tmp")).toThrow("No vault found");
  });

  test("finds vault with .napkin/ directory", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "napkin-only-test-"));
    fs.mkdirSync(path.join(tmpDir, ".napkin"));
    try {
      const result = findVault(tmpDir);
      expect(result.path).toBe(path.join(tmpDir, ".napkin"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("getVaultConfig", () => {
  test("reads existing config file", () => {
    const vaultPath = path.join(vault.path, ".napkin");
    const config = getVaultConfig(vaultPath, "app.json");
    expect(config).not.toBeNull();
    expect(config?.alwaysUpdateLinks).toBe(true);
  });

  test("returns null for missing config", () => {
    const vaultPath = path.join(vault.path, ".napkin");
    const config = getVaultConfig(vaultPath, "nonexistent.json");
    expect(config).toBeNull();
  });
});
