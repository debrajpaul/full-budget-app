import { test, expect } from "@playwright/test";

// ── helpers ───────────────────────────────────────────────────────────────────

async function loginAs(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  tenant: "PERSONAL" | "DEFAULT" | "CLIENT" = "PERSONAL"
) {
  const TENANT_LABEL: Record<typeof tenant, string> = {
    PERSONAL: "Personal",
    DEFAULT: "Personal (default)",
    CLIENT: "Client",
  };
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("combobox").click();
  await page
    .getByRole("option", { name: TENANT_LABEL[tenant], exact: true })
    .click();
  await page.getByRole("button", { name: "Sign in" }).click();
}

// ── tests ─────────────────────────────────────────────────────────────────────

test.describe("Auth flows", () => {
  test("register new user → shows success toast and redirects to /login", async ({
    page,
  }) => {
    // Use a timestamp-based email so re-runs don't collide on duplicate users.
    const email = `e2e-${Date.now()}@test.invalid`;

    await page.goto("/register");
    await page.getByLabel("Full name").fill("E2E Smoke User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("Smoke1234!");
    await page.getByLabel("Confirm password").fill("Smoke1234!");
    // Leave tenant at default ("Personal (default)")
    await page.getByRole("button", { name: /register/i }).click();

    // Successful registration shows a toast then navigates to /login
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("login with seed credentials → redirects to /dashboard", async ({
    page,
  }) => {
    await loginAs(page, "dev@local.test", "password123");
    await page.waitForURL("/dashboard");
    await expect(page).toHaveURL("/dashboard");
  });

  test("logout → clears session and redirects to /login", async ({ page }) => {
    // Log in first
    await loginAs(page, "dev@local.test", "password123");
    await page.waitForURL("/dashboard");

    // Click the user avatar to open the dropdown
    await page.getByRole("button", { name: "User menu" }).click();

    // Click "Sign out" in the dropdown
    await page.getByRole("menuitem", { name: /sign out/i }).click();

    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");

    // Confirm the session is gone: navigating to a protected page re-redirects
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("accessing /dashboard without session → redirects to /login", async ({
    page,
  }) => {
    // Fresh context — no cookies set
    await page.goto("/dashboard");
    // Middleware adds ?next=/dashboard to the redirect URL
    await expect(page).toHaveURL(/\/login/);
  });
});
