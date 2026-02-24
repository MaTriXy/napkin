import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { findVault, getVaultConfig } from "./vault.js";
import { createTempVault } from "./test-helpers.js";

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
    const fs = require("node:fs");
    fs.mkdirSync(sub, { recursive: true });
    const result = findVault(sub);
    expect(result.path).toBe(vault.path);
  });

  test("throws when no vault found", () => {
    expect(() => findVault("/tmp")).toThrow("No Obsidian vault found");
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
