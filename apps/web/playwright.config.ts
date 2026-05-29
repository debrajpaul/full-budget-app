import { defineConfig, devices } from "@playwright/test";

/**
 * Set PLAYWRIGHT_BASE_URL to an already-running app (e.g. a staging deploy)
 * and the webServer block is skipped entirely — useful in CI when the stack
 * is already deployed.
 *
 * Without it, Playwright starts `pnpm dev` locally and reuses any running
 * server on port 3000.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        port: 3000,
        reuseExistingServer: true,
        timeout: 120_000,
      },

  projects: [
    // ── Phase 1: obtain + cache a session for the seed user ──────────────────
    {
      name: "setup",
      testMatch: /setup\/auth\.setup\.ts/,
    },

    // ── Auth-flow tests (login, register, logout, redirect guard) ────────────
    // Run WITHOUT pre-authenticated state so the flows are tested end-to-end.
    {
      name: "auth",
      testMatch: /e2e\/auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // ── Authenticated smoke tests (dashboard, transactions) ──────────────────
    {
      name: "smoke",
      testMatch: /e2e\/(dashboard|transactions)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
});
