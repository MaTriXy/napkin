import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createTempVault } from "./test-helpers.js";
import { findVault, getVaultConfig } from "./vault.js";

let vault: { path: string; cleanup: () => void };

beforeEach(() => {
  vault = createTempVault();
});

afterEach(() => {
  vault.cleanup();
});

describe("findVault", () => {
  test("finds vault from vault root", () => {
    const result = findVault(vault.path);
    expect(result.path).toBe(vault.path);
  });

  test("finds vault from subdirectory", () => {
    const sub = `${vault.path}/some/nested/dir`;
    fs.mkdirSync(sub, { recursive: true });
    const result = findVault(sub);
    expect(result.path).toBe(vault.path);
  });

  test("throws when no vault found", () => {
    expect(() => findVault("/tmp")).toThrow("No vault found");
  });

  test("finds vault with only .napkin/ directory", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "napkin-only-test-"));
    fs.mkdirSync(path.join(tmpDir, ".napkin"));
    try {
      const result = findVault(tmpDir);
      expect(result.path).toBe(tmpDir);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("finds vault with only .obsidian/ directory", () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "obsidian-only-test-"),
    );
    fs.mkdirSync(path.join(tmpDir, ".obsidian"));
    try {
      const result = findVault(tmpDir);
      expect(result.path).toBe(tmpDir);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("getVaultConfig", () => {
  test("reads existing config file", () => {
    const config = getVaultConfig(vault.path, "app.json");
    expect(config).not.toBeNull();
    expect(config?.alwaysUpdateLinks).toBe(true);
  });

  test("returns null for missing config", () => {
    const config = getVaultConfig(vault.path, "nonexistent.json");
    expect(config).toBeNull();
  });
});
