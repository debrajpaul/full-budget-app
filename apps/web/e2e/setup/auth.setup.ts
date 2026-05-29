import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";

// Where the authenticated browser state is saved between the setup project
// and the smoke tests that depend on it.
export const AUTH_STATE_FILE = path.join(process.cwd(), "e2e/.auth/user.json");

setup("save authenticated session for dev@local.test", async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_STATE_FILE), { recursive: true });

  await page.goto("/login");

  await page.getByLabel("Email").fill("dev@local.test");
  await page.getByLabel("Password").fill("password123");

  // Tenant: "PERSONAL" — the shadcn Select renders as a combobox button
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Personal", exact: true }).click();

  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");

  await page.context().storageState({ path: AUTH_STATE_FILE });
});
